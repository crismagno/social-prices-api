import mongoose, { Model } from 'mongoose';

import {
	BadRequestException,
	ConflictException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../infra/database/mongo/schemas';
import { AppNotEnabledException } from '../apps/apps.exceptions';
import { AppsRealtimeGateway } from '../apps/core/realtime/apps-realtime.gateway';
import AppsEnum from '../apps/interfaces/apps.enum';
import { Customer } from '../customers/interfaces/customer.schema';
import { createUsernameByName } from '../../shared/utils/global/global';
import FeatureLimitsEnum from '../feature-limits/interfaces/feature-limits.enum';
import { FeatureLimitsService } from '../feature-limits/feature-limits.service';
import { IUser } from '../users/interfaces/user.interface';
import { UsersService } from '../users/users.service';
import {
	IInboxChannelAdapter,
	IInboxReplyContext,
} from './inbox-channel.adapter';
import { InboxChannelRegistry } from './inbox-channel.registry';
import { InboxConversationsService } from './inbox-conversations.service';
import { InboxMessagesService } from './inbox-messages.service';
import {
	IInboxAttachmentView,
	IInboxChatView,
	IInboxConversationView,
	IInboxMessageView,
	IInboxScope,
} from './interfaces/inbox-central.types';
import InboxEnum from './interfaces/inbox.enum';
import {
	IInboxAttachment,
	IInboxConversation,
	IInboxMessage,
} from './interfaces/inbox.types';

export const MESSAGE_NOT_DELETABLE_CODE: string = 'MESSAGE_NOT_DELETABLE';
export const REPLY_WINDOW_CLOSED_CODE: string = 'REPLY_WINDOW_CLOSED';
const MAX_REPLY_LENGTH: number = 1000;

/** The app a user must have enabled to see and answer each channel. */
const APP_BY_CHANNEL: Record<InboxEnum.Channel, AppsEnum.App> = {
	[InboxEnum.Channel.TELEGRAM]: AppsEnum.App.TELEGRAM,
	[InboxEnum.Channel.MESSENGER]: AppsEnum.App.FACEBOOK,
	[InboxEnum.Channel.INSTAGRAM]: AppsEnum.App.INSTAGRAM,
};

interface ICustomerCard {
	_id: string;
	name: string | null;
	avatar: string | null;
}

/** What the central page reads: every channel's conversations, grouped by customer. */
@Injectable()
export class InboxCentralService {
	constructor(
		@InjectModel(schemasName.customer)
		private readonly _customerModel: Model<Customer>,
		private readonly _conversations: InboxConversationsService,
		private readonly _messages: InboxMessagesService,
		private readonly _registry: InboxChannelRegistry,
		private readonly _usersService: UsersService,
		private readonly _realtime: AppsRealtimeGateway,
		private readonly _featureLimitsService: FeatureLimitsService,
	) {}

	/**
	 * The list of the page: one row per customer (with all their conversations) and
	 * one per person not tied to a customer yet, most recent first.
	 */
	public async listChats(ownerUserId: string): Promise<IInboxChatView[]> {
		const enabled: Set<InboxEnum.Channel> =
			await this._enabledChannels(ownerUserId);

		const conversations: IInboxConversation[] = (
			await this._conversations.listAll(ownerUserId)
		).filter((conversation: IInboxConversation) =>
			enabled.has(conversation.channel),
		);

		const customers: Map<string, ICustomerCard> = await this._customersOf(
			ownerUserId,
			conversations,
		);

		const rows: Map<string, IInboxConversation[]> = new Map();

		for (const conversation of conversations) {
			const key: string = conversation.customerId
				? String(conversation.customerId)
				: `conversation:${conversation._id}`;

			rows.set(key, [...(rows.get(key) ?? []), conversation]);
		}

		return Array.from(rows.entries())
			.map(([key, group]: [string, IInboxConversation[]]) =>
				this._toChatView(key, group, customers),
			)
			.sort(
				(a: IInboxChatView, b: IInboxChatView) =>
					b.lastMessageAt.getTime() - a.lastMessageAt.getTime(),
			);
	}

	/** The timeline of a customer (every channel together) or of one conversation, newest first. */
	public async listMessages(
		ownerUserId: string,
		scope: IInboxScope,
		options: { limit?: number; before?: string } = {},
	): Promise<IInboxMessageView[]> {
		const conversations: IInboxConversation[] = await this._scope(
			ownerUserId,
			scope,
		);

		return (
			await this._messages.listTimeline(
				ownerUserId,
				conversations.map((conversation: IInboxConversation) =>
					String(conversation._id),
				),
				options,
			)
		).map((message: IInboxMessage) => this._toMessageView(message));
	}

	/** Reads everything in scope: the unread count of each of its conversations goes to zero. */
	public async markRead(
		ownerUserId: string,
		scope: IInboxScope,
	): Promise<void> {
		for (const conversation of await this._scope(ownerUserId, scope)) {
			if (conversation.unreadCount > 0) {
				await this._conversations.markRead(
					ownerUserId,
					String(conversation._id),
				);
			}
		}
	}

	/** The conversations a customer has, for the buttons of their profile. */
	public async summary(
		ownerUserId: string,
		customerId: string,
	): Promise<IInboxConversationView[]> {
		return (await this._scope(ownerUserId, { customerId })).map(
			(conversation: IInboxConversation) =>
				this._toConversationView(conversation),
		);
	}

	/**
	 * Ties a conversation to a customer, moves it to another, or frees it (null).
	 * The history goes with the conversation: nothing is copied.
	 */
	public async assignCustomer(
		ownerUserId: string,
		conversationId: string,
		customerId: string | null,
	): Promise<IInboxChatView> {
		const conversation: IInboxConversation = await this._ownedConversation(
			ownerUserId,
			conversationId,
		);

		if (
			customerId &&
			!(await this._customerModel.exists({ _id: customerId, ownerUserId }))
		) {
			throw new NotFoundException('Customer not found.');
		}

		await this._conversations.setCustomer(
			ownerUserId,
			String(conversation._id),
			customerId,
		);

		this._realtime.notifyInboxUpdated(
			ownerUserId,
			APP_BY_CHANNEL[conversation.channel],
			conversation.contactKey,
		);

		const row: IInboxChatView | undefined = (
			await this.listChats(ownerUserId)
		).find((chat: IInboxChatView) =>
			chat.conversations.some(
				(item: IInboxConversationView) => item._id === String(conversation._id),
			),
		);

		return row;
	}

	/**
	 * Makes a customer out of the person of a loose conversation and ties it to
	 * it, within the plan's customers limit. Channels give no e-mail or phone, so
	 * the customer starts with the name (and @username) the channel shows.
	 */
	public async createCustomer(
		ownerUserId: string,
		conversationId: string,
	): Promise<IInboxChatView> {
		const conversation: IInboxConversation = await this._ownedConversation(
			ownerUserId,
			conversationId,
		);

		if (conversation.customerId) {
			throw new ConflictException('This conversation already has a customer.');
		}

		await this._featureLimitsService.assertCanCreate(
			ownerUserId,
			FeatureLimitsEnum.Feature.CUSTOMERS,
		);

		const username: string | null = conversation.contact?.username ?? null;
		const name: string =
			conversation.contact?.name ||
			(username
				? `@${username}`
				: `${conversation.channel} ${conversation.contactKey}`);
		const now: Date = new Date();

		const created = await this._customerModel.create({
			avatar: null,
			name,
			email: null,
			birthDate: null,
			addresses: [],
			about: username ? `@${username}` : null,
			idNumber: null,
			cpf: null,
			cnpj: null,
			phoneNumbers: [],
			tagsIds: [],
			ownerUserId,
			userId: null,
			uniqName: await this._freeUniqName(ownerUserId, name),
			uploadFilename: null,
			externalSources: [],
			createdAt: now,
			updatedAt: now,
		});

		return await this.assignCustomer(
			ownerUserId,
			String(conversation._id),
			String(created._id),
		);
	}

	/**
	 * Answers through one conversation's channel, which applies its own rules (a
	 * closed answer window is refused before asking the channel).
	 */
	public async reply(
		ctx: IInboxReplyContext,
		conversationId: string,
		text: string,
	): Promise<IInboxMessageView> {
		const body: string = (text ?? '').trim();

		if (!body || body.length > MAX_REPLY_LENGTH) {
			throw new BadRequestException(
				`The message must have between 1 and ${MAX_REPLY_LENGTH} characters.`,
			);
		}

		const conversation: IInboxConversation = await this._ownedConversation(
			ctx.ownerUserId,
			conversationId,
		);

		const adapter: IInboxChannelAdapter = this._registry.get(
			conversation.channel,
		);

		if (!adapter.canReply(conversation).allowed) {
			throw new ConflictException({
				code: REPLY_WINDOW_CLOSED_CODE,
				message: 'The answer window of this conversation is closed.',
			});
		}

		return this._toMessageView(await adapter.sendText(ctx, conversation, body));
	}

	/**
	 * Removes a message through its channel: Telegram deletes it for the customer
	 * too, the others only take it out of the inbox.
	 */
	public async deleteMessage(
		ownerUserId: string,
		messageId: string,
	): Promise<void> {
		const message: IInboxMessage | null = await this._messages.findById(
			ownerUserId,
			messageId,
		);

		const conversation: IInboxConversation | null = message
			? await this._ownedConversation(
					ownerUserId,
					String(message.conversationId),
			  )
			: null;

		if (!message || !conversation) {
			throw new NotFoundException('Message not found.');
		}

		const adapter: IInboxChannelAdapter = this._registry.get(
			conversation.channel,
		);

		if (!adapter.capabilities.deleteMessage || !adapter.deleteMessage) {
			throw new ConflictException({
				code: MESSAGE_NOT_DELETABLE_CODE,
				message: 'This channel does not let messages be removed.',
			});
		}

		await adapter.deleteMessage(ownerUserId, conversation, message);
	}

	/** One file of a message, fetched from its channel when asked for. */
	public async getAttachment(
		ownerUserId: string,
		messageId: string,
		index: number,
	): Promise<{ buffer: Buffer; contentType: string; fileName: string | null }> {
		const message: IInboxMessage | null = await this._messages.findById(
			ownerUserId,
			messageId,
		);

		const conversation: IInboxConversation | null = message
			? await this._conversations.findById(
					ownerUserId,
					String(message.conversationId),
			  )
			: null;

		if (!message || !conversation || !message.attachments?.[index]) {
			throw new NotFoundException('Attachment not found.');
		}

		await this._assertEnabled(ownerUserId, conversation.channel);

		return await this._registry
			.get(conversation.channel)
			.fetchAttachment(ownerUserId, conversation, message, index);
	}

	//#region Private Methods

	private async _scope(
		ownerUserId: string,
		scope: IInboxScope,
	): Promise<IInboxConversation[]> {
		const enabled: Set<InboxEnum.Channel> =
			await this._enabledChannels(ownerUserId);

		let found: IInboxConversation[] = [];

		if (scope.customerId) {
			found = await this._conversations.listByCustomer(
				ownerUserId,
				scope.customerId,
			);
		} else if (scope.conversationId) {
			const conversation: IInboxConversation | null =
				await this._conversations.findById(ownerUserId, scope.conversationId);

			found = conversation ? [conversation] : [];
		}

		return found.filter((conversation: IInboxConversation) =>
			enabled.has(conversation.channel),
		);
	}

	/** The channels whose app the manager enabled for this user: the others stay out of sight. */
	private async _enabledChannels(
		ownerUserId: string,
	): Promise<Set<InboxEnum.Channel>> {
		const user: IUser | undefined =
			await this._usersService.findOneById(ownerUserId);

		return new Set(
			(Object.values(InboxEnum.Channel) as InboxEnum.Channel[]).filter(
				(channel: InboxEnum.Channel) =>
					user?.enabledApps?.includes(APP_BY_CHANNEL[channel]),
			),
		);
	}

	private async _assertEnabled(
		ownerUserId: string,
		channel: InboxEnum.Channel,
	): Promise<void> {
		if (!(await this._enabledChannels(ownerUserId)).has(channel)) {
			throw new AppNotEnabledException(APP_BY_CHANNEL[channel]);
		}
	}

	/** uniqName is not unique in the schema, so avoid collisions here. */
	private async _freeUniqName(
		ownerUserId: string,
		name: string,
	): Promise<string> {
		const base: string = createUsernameByName(name);
		let candidate: string = base;

		for (let attempt = 0; attempt < 5; attempt++) {
			if (
				!(await this._customerModel.exists({
					ownerUserId,
					uniqName: candidate,
				}))
			) {
				return candidate;
			}

			candidate = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
		}

		return candidate;
	}

	private async _ownedConversation(
		ownerUserId: string,
		conversationId: string,
	): Promise<IInboxConversation> {
		const conversation: IInboxConversation | null =
			await this._conversations.findById(ownerUserId, conversationId);

		if (!conversation) {
			throw new NotFoundException('Conversation not found.');
		}

		await this._assertEnabled(ownerUserId, conversation.channel);

		return conversation;
	}

	private async _customersOf(
		ownerUserId: string,
		conversations: IInboxConversation[],
	): Promise<Map<string, ICustomerCard>> {
		const ids: string[] = Array.from(
			new Set(
				conversations
					.filter((conversation: IInboxConversation) => conversation.customerId)
					.map((conversation: IInboxConversation) =>
						String(conversation.customerId),
					)
					.filter((id: string) => mongoose.isValidObjectId(id)),
			),
		);

		if (!ids.length) {
			return new Map();
		}

		const found: ICustomerCard[] = await this._customerModel
			.find({ ownerUserId, _id: { $in: ids } }, { name: 1, avatar: 1 })
			.lean<ICustomerCard[]>();

		return new Map(
			found.map((customer: ICustomerCard) => [String(customer._id), customer]),
		);
	}

	private _toChatView(
		key: string,
		group: IInboxConversation[],
		customers: Map<string, ICustomerCard>,
	): IInboxChatView {
		// The group arrives most recent first, so the first one holds the last message.
		const latest: IInboxConversation = group[0];
		const customer: ICustomerCard | undefined = latest.customerId
			? customers.get(String(latest.customerId))
			: undefined;

		// The answer goes by default to who wrote last; with nobody having written,
		// to the conversation with the latest message.
		const replyTo: IInboxConversation = group.reduce(
			(best: IInboxConversation, item: IInboxConversation) =>
				new Date(item.lastIncomingAt).getTime() >
				new Date(best.lastIncomingAt).getTime()
					? item
					: best,
			latest,
		);

		return {
			key,
			customerId: latest.customerId ? String(latest.customerId) : null,
			name:
				customer?.name ??
				latest.contact?.name ??
				latest.contact?.username ??
				null,
			avatar: customer?.avatar ?? null,
			channels: Array.from(
				new Set(
					group.map((conversation: IInboxConversation) => conversation.channel),
				),
			),
			conversations: group.map((conversation: IInboxConversation) =>
				this._toConversationView(conversation),
			),
			replyConversationId: String(replyTo._id),
			lastMessageAt: latest.lastMessageAt,
			lastMessageText: latest.lastMessageText,
			lastMessageKind: latest.lastMessageKind,
			lastMessageChannel: latest.channel,
			lastMessageDirection: latest.lastMessageDirection,
			unreadCount: group.reduce(
				(total: number, conversation: IInboxConversation) =>
					total + (conversation.unreadCount ?? 0),
				0,
			),
		};
	}

	private _toConversationView(
		conversation: IInboxConversation,
	): IInboxConversationView {
		const reply = this._canReply(conversation);

		return {
			_id: String(conversation._id),
			channel: conversation.channel,
			contactKey: conversation.contactKey,
			name: conversation.contact?.name ?? null,
			username: conversation.contact?.username ?? null,
			profilePic: conversation.contact?.profilePic ?? null,
			unreadCount: conversation.unreadCount ?? 0,
			lastMessageAt: conversation.lastMessageAt,
			canReply: reply.allowed,
			replyWindowEndsAt: reply.windowEndsAt,
		};
	}

	private _canReply(conversation: IInboxConversation): {
		allowed: boolean;
		windowEndsAt: Date | null;
	} {
		try {
			return this._registry.get(conversation.channel).canReply(conversation);
		} catch {
			// A channel whose adapter is not up cannot be answered through.
			return { allowed: false, windowEndsAt: null };
		}
	}

	private _toMessageView(message: IInboxMessage): IInboxMessageView {
		return {
			_id: String(message._id),
			conversationId: String(message.conversationId),
			channel: message.channel,
			direction: message.direction,
			kind: message.kind,
			text: message.text,
			attachments: (message.attachments ?? []).map(
				(
					attachment: IInboxAttachment,
					index: number,
				): IInboxAttachmentView => ({
					index,
					kind: attachment.kind,
					mimeType: attachment.mimeType,
					fileName: attachment.fileName,
					size: attachment.size,
					width: attachment.width,
					height: attachment.height,
					duration: attachment.duration,
				}),
			),
			isUnsupported: message.isUnsupported,
			sentAt: message.sentAt,
			sentByEmployeeId: message.sentByEmployeeId,
			canDelete: this._canDelete(message.channel),
		};
	}

	private _canDelete(channel: InboxEnum.Channel): boolean {
		try {
			return this._registry.get(channel).capabilities.deleteMessage;
		} catch {
			return false;
		}
	}

	//#endregion
}
