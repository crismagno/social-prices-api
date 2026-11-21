import { escapeRegExp } from 'lodash';
import mongoose, { Model } from 'mongoose';

import {
	BadRequestException,
	HttpException,
	HttpStatus,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../infra/database/mongo/schemas';
import { AppsRealtimeGateway } from '../apps/core/realtime/apps-realtime.gateway';
import { Customer } from '../customers/interfaces/customer.schema';
import { InboxConversationsService } from '../inbox/inbox-conversations.service';
import { InboxMessagesService } from '../inbox/inbox-messages.service';
import InboxEnum from '../inbox/interfaces/inbox.enum';
import { IInboxUploadFile } from '../inbox/inbox-channel.adapter';
import { IInboxAttachmentView } from '../inbox/interfaces/inbox-central.types';
import {
	IConversationKey,
	IInboxAttachment,
	IInboxConversation,
	IInboxMessage,
	IInboxMessageInput,
} from '../inbox/interfaces/inbox.types';
import { IStore } from '../stores/interfaces/store.interface';
import { IUser } from '../users/interfaces/user.interface';
import { UsersService } from '../users/users.service';
import {
	IStoreChatBuyer,
	IStoreChatConversationView,
	IStoreChatMessageView,
	IStoreChatStoreCard,
} from './interfaces/store-chat.types';
import { StoreChatDeletionService } from './store-chat-deletion.service';
import { StoreChatEditionService } from './store-chat-edition.service';
import {
	IStoreChatFile,
	StoreChatMediaService,
} from './store-chat-media.service';
import { StoreChatStoresService } from './store-chat-stores.service';
import {
	STORE_CHAT_CODES,
	STORE_CHAT_DAILY_NEW_CONVERSATIONS,
	STORE_CHAT_MAX_TEXT,
	STORE_CHAT_WINDOW_MS,
	storeChatContactKey,
} from './store-chat.constants';

/** The text of a message as it is stored, or a refusal. Shared by both sides. */
export const storeChatText = (text: unknown): string => {
	const body: string = typeof text === 'string' ? text.trim() : '';

	if (!body || body.length > STORE_CHAT_MAX_TEXT) {
		throw new BadRequestException(
			`The message must have between 1 and ${STORE_CHAT_MAX_TEXT} characters.`,
		);
	}

	return body;
};

/** What each file of a message is, without where it is kept. */
export const storeChatAttachmentViews = (
	message: IInboxMessage,
): IInboxAttachmentView[] =>
	(message.attachments ?? []).map(
		(attachment: IInboxAttachment, index: number): IInboxAttachmentView => ({
			index,
			kind: attachment.kind,
			mimeType: attachment.mimeType ?? null,
			fileName: attachment.fileName ?? null,
			size: attachment.size ?? null,
			width: attachment.width ?? null,
			height: attachment.height ?? null,
			duration: attachment.duration ?? null,
		}),
	);

/** A message of the store chat (a text, unless said otherwise), ready for the inbox to store. */
export const storeChatMessageInput = (
	text: string | null,
	extra: Partial<IInboxMessageInput> = {},
): IInboxMessageInput => ({
	channelMessageId: new mongoose.Types.ObjectId().toString(),
	kind: InboxEnum.MessageKind.TEXT,
	text,
	attachments: [],
	sentAt: new Date(),
	...extra,
});

/**
 * The store chat from the customer account's side. Everything is keyed by the
 * store, and a conversation is always found through the account itself, so an
 * account can only ever reach its own.
 */
@Injectable()
export class StoreChatService {
	//#region Constructor

	constructor(
		@InjectModel(schemasName.customer)
		private readonly _customerModel: Model<Customer>,
		private readonly _conversations: InboxConversationsService,
		private readonly _messages: InboxMessagesService,
		private readonly _stores: StoreChatStoresService,
		private readonly _usersService: UsersService,
		private readonly _realtime: AppsRealtimeGateway,
		private readonly _deletion: StoreChatDeletionService,
		private readonly _media: StoreChatMediaService,
		private readonly _edition: StoreChatEditionService,
	) {}

	//#endregion

	//#region Public Methods

	public async listConversations(
		buyer: IStoreChatBuyer,
	): Promise<IStoreChatConversationView[]> {
		const conversations: IInboxConversation[] = (
			await this._conversations.listByContactUser(buyer.userId)
		).filter(
			(conversation: IInboxConversation) =>
				conversation.channel === InboxEnum.Channel.STORE,
		);

		const cards: Map<string, IStoreChatStoreCard> =
			await this._stores.cardsByIds(
				conversations.map((conversation: IInboxConversation) =>
					String(conversation.accountKey),
				),
			);

		return conversations
			.filter((conversation: IInboxConversation) =>
				cards.has(String(conversation.accountKey)),
			)
			.map((conversation: IInboxConversation) => ({
				store: cards.get(String(conversation.accountKey)),
				lastMessageAt: conversation.lastMessageAt,
				lastMessageText: conversation.lastMessageText,
				lastMessageKind: conversation.lastMessageKind ?? null,
				lastMessageFromMe:
					conversation.lastMessageDirection === InboxEnum.Direction.IN,
				unreadCount: conversation.contactUnreadCount ?? 0,
			}));
	}

	/** The thread with a store, newest first; empty before the first message. */
	public async listMessages(
		buyer: IStoreChatBuyer,
		storeId: string,
		before?: string,
	): Promise<IStoreChatMessageView[]> {
		const conversation: IInboxConversation | null = await this._own(
			buyer,
			storeId,
		);

		if (!conversation) {
			await this._stores.findUsable(storeId);

			return [];
		}

		const messages: IInboxMessage[] = await this._messages.listByConversation(
			String(conversation.ownerUserId),
			String(conversation._id),
			{ before: mongoose.isValidObjectId(before) ? before : undefined },
		);

		return messages.map((message: IInboxMessage) => this._toView(message));
	}

	/** Writes to a store. The first message is what opens the conversation. */
	public async send(
		buyer: IStoreChatBuyer,
		storeId: string,
		text: string,
	): Promise<IStoreChatMessageView> {
		const body: string = storeChatText(text);

		return await this._deliver(buyer, storeId, async () => ({
			kind: InboxEnum.MessageKind.TEXT,
			text: body,
			attachments: [],
		}));
	}

	/**
	 * Sends a file, or a recording, to a store, with a caption if there is one.
	 * Like a text, it can be what opens the conversation.
	 */
	public async sendMedia(
		buyer: IStoreChatBuyer,
		storeId: string,
		file: IInboxUploadFile,
		options: { caption: string | null; asVoice: boolean },
	): Promise<IStoreChatMessageView> {
		const caption: string | null = this._media.caption(options.caption);

		// Refused before the conversation is opened or anything is stored.
		this._media.assertSendable(file);

		return await this._deliver(buyer, storeId, async () => {
			const attachment: IInboxAttachment = await this._media.store(
				file,
				options.asVoice,
			);

			return {
				kind: attachment.kind,
				text: caption,
				attachments: [attachment],
			};
		});
	}

	/** One file of a message of the account's own conversation with that store. */
	public async getAttachment(
		buyer: IStoreChatBuyer,
		storeId: string,
		messageId: string,
		index: number,
	): Promise<IStoreChatFile> {
		const conversation: IInboxConversation | null = await this._own(
			buyer,
			storeId,
		);

		const message: IInboxMessage | null =
			conversation && mongoose.isValidObjectId(messageId)
				? await this._messages.findOwned(
						String(conversation.ownerUserId),
						String(conversation._id),
						messageId,
				  )
				: null;

		if (!message) {
			throw new NotFoundException('Attachment not found.');
		}

		return await this._media.read(message, index);
	}

	/**
	 * Changes the words of a message the account itself wrote (its text, or the
	 * caption of its file); the store sees the new ones.
	 */
	public async editMessage(
		buyer: IStoreChatBuyer,
		storeId: string,
		messageId: string,
		text: string,
	): Promise<IStoreChatMessageView> {
		const body: string = storeChatText(text);

		const conversation: IInboxConversation | null = await this._own(
			buyer,
			storeId,
		);

		if (!conversation) {
			throw new NotFoundException('Message not found.');
		}

		return this._toView(
			await this._edition.edit(
				conversation,
				messageId,
				InboxEnum.Direction.IN,
				body,
			),
		);
	}

	/**
	 * The account is writing to the store: whoever has the conversation open
	 * there sees it for a few seconds. Nothing is stored, and with no
	 * conversation yet there is nobody to tell.
	 */
	public async typing(buyer: IStoreChatBuyer, storeId: string): Promise<void> {
		const conversation: IInboxConversation | null = await this._own(
			buyer,
			storeId,
		);

		if (!conversation) {
			return;
		}

		this._realtime.notifyStoreChatTyping(String(conversation.ownerUserId), {
			storeId: String(conversation.accountKey),
			conversationId: String(conversation._id),
		});
	}

	/** Removes a message the account itself wrote; it is gone for the store too. */
	public async deleteMessage(
		buyer: IStoreChatBuyer,
		storeId: string,
		messageId: string,
	): Promise<void> {
		const conversation: IInboxConversation | null = await this._own(
			buyer,
			storeId,
		);

		if (!conversation) {
			throw new NotFoundException('Message not found.');
		}

		await this._deletion.remove(
			conversation,
			messageId,
			InboxEnum.Direction.IN,
		);
	}

	public async markRead(
		buyer: IStoreChatBuyer,
		storeId: string,
	): Promise<void> {
		const conversation: IInboxConversation | null = await this._own(
			buyer,
			storeId,
		);

		if (!conversation) {
			return;
		}

		await this._conversations.markContactRead(
			buyer.userId,
			String(conversation._id),
		);
	}

	public async countUnread(buyer: IStoreChatBuyer): Promise<number> {
		return await this._conversations.countContactUnread(buyer.userId);
	}

	//#endregion

	//#region Private Methods

	/**
	 * Puts a message of the account in its conversation with the store, opening
	 * it first if this is the first one. `make` builds the content only after
	 * everything that can refuse the message has passed.
	 */
	private async _deliver(
		buyer: IStoreChatBuyer,
		storeId: string,
		make: () => Promise<
			Pick<IInboxMessageInput, 'kind' | 'text' | 'attachments'>
		>,
	): Promise<IStoreChatMessageView> {
		const store: IStore = await this._stores.findUsable(storeId);

		const ownerUserId: string = String(store.userId);

		if (ownerUserId === String(buyer.userId)) {
			throw new BadRequestException({
				code: STORE_CHAT_CODES.OWN_STORE,
				message: 'You cannot write to your own store.',
			});
		}

		const name: string = await this._nameOf(buyer);

		const conversation: IInboxConversation =
			(await this._own(buyer, storeId)) ??
			(await this._open(buyer, store, ownerUserId, name));

		const conversationId: string = String(conversation._id);

		const content = await make();

		const input: IInboxMessageInput = storeChatMessageInput(content.text, {
			kind: content.kind,
			attachments: content.attachments,
			sender: { id: buyer.userId, name, username: null },
		});

		await this._messages.saveIncoming(ownerUserId, conversation, input);

		await this._conversations.applyIncoming(ownerUserId, conversationId, {
			preview: {
				text: content.text,
				kind: content.kind,
				channelKind: null,
				direction: InboxEnum.Direction.IN,
				at: input.sentAt,
			},
		});

		this._realtime.notifyStoreChatUpdated(ownerUserId, {
			storeId: String(store._id),
			conversationId,
		});

		const saved: IInboxMessage | null =
			await this._messages.findByChannelMessageId(
				ownerUserId,
				conversationId,
				input.channelMessageId,
			);

		return this._toView(
			saved ??
				({
					_id: input.channelMessageId,
					direction: InboxEnum.Direction.IN,
					kind: content.kind,
					text: content.text,
					attachments: content.attachments,
					sentAt: input.sentAt,
				} as IInboxMessage),
		);
	}

	private _key(buyer: IStoreChatBuyer, storeId: string): IConversationKey {
		return {
			channel: InboxEnum.Channel.STORE,
			contactKey: storeChatContactKey(buyer.userId, String(storeId)),
		};
	}

	/** The account's conversation with a store, if it has one. Never anyone else's. */
	private async _own(
		buyer: IStoreChatBuyer,
		storeId: string,
	): Promise<IInboxConversation | null> {
		return await this._conversations.findByContact(
			buyer.userId,
			this._key(buyer, storeId),
		);
	}

	/** Opens the conversation, unless the account already opened too many today. */
	private async _open(
		buyer: IStoreChatBuyer,
		store: IStore,
		ownerUserId: string,
		name: string,
	): Promise<IInboxConversation> {
		const openedToday: number =
			await this._conversations.countCreatedByContactSince(
				buyer.userId,
				new Date(Date.now() - STORE_CHAT_WINDOW_MS),
			);

		if (openedToday >= STORE_CHAT_DAILY_NEW_CONVERSATIONS) {
			throw new HttpException(
				{
					code: STORE_CHAT_CODES.DAILY_LIMIT,
					message: `You can start at most ${STORE_CHAT_DAILY_NEW_CONVERSATIONS} new conversations a day.`,
				},
				HttpStatus.TOO_MANY_REQUESTS,
			);
		}

		const storeId: string = String(store._id);

		const { conversation } = await this._conversations.ensure(
			ownerUserId,
			this._key(buyer, storeId),
			{
				accountKey: storeId,
				contactUserId: buyer.userId,
				customerId: await this._customerIdOf(ownerUserId, buyer),
				contact: {
					name,
					extra: {
						customerUserId: buyer.userId,
						storeId,
						storeName: store.name,
					},
				},
			},
		);

		return conversation;
	}

	/** The account's name, or its e-mail when it has none: the store must see someone. */
	private async _nameOf(buyer: IStoreChatBuyer): Promise<string> {
		const user: IUser | undefined = await this._usersService.findOneById(
			buyer.userId,
		);

		return user?.name?.trim() || buyer.email;
	}

	/** The store owner's customer that is this account: by the account, else by its e-mail. */
	private async _customerIdOf(
		ownerUserId: string,
		buyer: IStoreChatBuyer,
	): Promise<string | null> {
		const byAccount = await this._customerModel
			.findOne({ ownerUserId, userId: buyer.userId })
			.lean<{ _id: unknown }>();

		if (byAccount) {
			return String(byAccount._id);
		}

		const byEmail = await this._customerModel
			.findOne({
				ownerUserId,
				email: new RegExp(`^${escapeRegExp(buyer.email)}$`, 'i'),
			})
			.lean<{ _id: unknown }>();

		return byEmail ? String(byEmail._id) : null;
	}

	private _toView(message: IInboxMessage): IStoreChatMessageView {
		return {
			_id: String(message._id),
			fromMe: message.direction === InboxEnum.Direction.IN,
			kind: message.kind ?? InboxEnum.MessageKind.TEXT,
			text: message.text,
			attachments: storeChatAttachmentViews(message),
			sentAt: message.sentAt,
			editedAt: message.editedAt ?? null,
		};
	}

	//#endregion
}
