import { escapeRegExp } from 'lodash';
import mongoose, { Model } from 'mongoose';

import {
	BadRequestException,
	HttpException,
	HttpStatus,
	Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../infra/database/mongo/schemas';
import { AppsRealtimeGateway } from '../apps/core/realtime/apps-realtime.gateway';
import { Customer } from '../customers/interfaces/customer.schema';
import { InboxConversationsService } from '../inbox/inbox-conversations.service';
import { InboxMessagesService } from '../inbox/inbox-messages.service';
import InboxEnum from '../inbox/interfaces/inbox.enum';
import {
	IConversationKey,
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

/** A text message of the store chat, ready for the inbox to store. */
export const storeChatMessageInput = (
	text: string,
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

		const input: IInboxMessageInput = storeChatMessageInput(body, {
			sender: { id: buyer.userId, name, username: null },
		});

		await this._messages.saveIncoming(ownerUserId, conversation, input);

		await this._conversations.applyIncoming(ownerUserId, conversationId, {
			preview: {
				text: body,
				kind: InboxEnum.MessageKind.TEXT,
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
					text: body,
					sentAt: input.sentAt,
				} as IInboxMessage),
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
			text: message.text,
			sentAt: message.sentAt,
		};
	}

	//#endregion
}
