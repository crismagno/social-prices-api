import { escapeRegExp } from 'lodash';
import mongoose, { Model } from 'mongoose';

import {
	BadRequestException,
	ConflictException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../infra/database/mongo/schemas';
import { AppsRealtimeGateway } from '../apps/core/realtime/apps-realtime.gateway';
import { ICustomer } from '../customers/interfaces/customer.interface';
import { Customer } from '../customers/interfaces/customer.schema';
import { IInboxReplyContext } from '../inbox/inbox-channel.adapter';
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
import { Store } from '../stores/interfaces/store.schema';
import { IUser } from '../users/interfaces/user.interface';
import { IStoreChatStarted } from './interfaces/store-chat.types';
import { STORE_CHAT_CODES, storeChatContactKey } from './store-chat.constants';
import { storeChatMessageInput, storeChatText } from './store-chat.service';

/**
 * The store chat from the store's side: answering (through the central inbox)
 * and being the one who writes first to a customer that has an account.
 */
@Injectable()
export class StoreChatOwnerService {
	//#region Constructor

	constructor(
		@InjectModel(schemasName.store) private readonly _storeModel: Model<Store>,
		@InjectModel(schemasName.customer)
		private readonly _customerModel: Model<Customer>,
		@InjectModel(schemasName.user) private readonly _userModel: Model<IUser>,
		private readonly _conversations: InboxConversationsService,
		private readonly _messages: InboxMessagesService,
		private readonly _realtime: AppsRealtimeGateway,
	) {}

	//#endregion

	//#region Public Methods

	/** Stores the store's message and lets the account on the other side know. */
	public async sendText(
		ctx: IInboxReplyContext,
		conversation: IInboxConversation,
		text: string,
	): Promise<IInboxMessage> {
		const conversationId: string = String(conversation._id);

		const input: IInboxMessageInput = storeChatMessageInput(text, {
			sentByEmployeeId: ctx.employeeId ?? null,
		});

		const saved: IInboxMessage = await this._messages.saveOutgoing(
			ctx.ownerUserId,
			conversation,
			input,
		);

		await this._conversations.applyOutgoing(ctx.ownerUserId, conversationId, {
			text,
			kind: InboxEnum.MessageKind.TEXT,
			channelKind: null,
			direction: InboxEnum.Direction.OUT,
			at: input.sentAt,
		});

		await this._conversations.incContactUnread(ctx.ownerUserId, conversationId);

		if (conversation.contactUserId) {
			this._realtime.notifyStoreChatUpdated(
				String(conversation.contactUserId),
				{ storeId: String(conversation.accountKey), conversationId },
			);
		}

		return saved;
	}

	/**
	 * Writes first to a customer, from one of the user's stores. The customer must
	 * have an account on the platform: that is where the message is read.
	 */
	public async start(
		ctx: IInboxReplyContext,
		customerId: string,
		storeId: string,
		text: string,
	): Promise<IStoreChatStarted> {
		const body: string = storeChatText(text);

		const store: IStore = await this._ownStore(ctx.ownerUserId, storeId);

		const customer: ICustomer = await this._ownCustomer(
			ctx.ownerUserId,
			customerId,
		);

		const account: IUser | null = await this._accountOf(customer);

		if (!account) {
			throw new ConflictException({
				code: STORE_CHAT_CODES.NO_ACCOUNT,
				message: 'This customer has no account on the platform yet.',
			});
		}

		const accountId: string = String(account._id);

		if (accountId === String(ctx.ownerUserId)) {
			throw new BadRequestException({
				code: STORE_CHAT_CODES.OWN_STORE,
				message: 'You cannot write to your own store.',
			});
		}

		const key: IConversationKey = {
			channel: InboxEnum.Channel.STORE,
			contactKey: storeChatContactKey(accountId, String(store._id)),
		};

		const conversation: IInboxConversation =
			(await this._conversations.findByKey(ctx.ownerUserId, key)) ??
			(
				await this._conversations.ensure(ctx.ownerUserId, key, {
					accountKey: String(store._id),
					contactUserId: accountId,
					customerId: String(customer._id),
					contact: {
						name: account.name?.trim() || customer.name || account.email,
						extra: {
							customerUserId: accountId,
							storeId: String(store._id),
							storeName: store.name,
						},
					},
				})
			).conversation;

		await this.sendText(ctx, conversation, body);

		return {
			conversationId: String(conversation._id),
			customerId: String(customer._id),
		};
	}

	/** What the user has not read on this channel, for the menu's badge. */
	public async countUnread(ownerUserId: string): Promise<number> {
		return await this._conversations.countUnread(
			ownerUserId,
			InboxEnum.Channel.STORE,
		);
	}

	//#endregion

	//#region Private Methods

	private async _ownStore(
		ownerUserId: string,
		storeId: string,
	): Promise<IStore> {
		const store: IStore | null = mongoose.isValidObjectId(storeId)
			? await this._storeModel
					.findOne({ _id: storeId, userId: ownerUserId, softDelete: null })
					.lean<IStore>()
			: null;

		if (!store) {
			throw new NotFoundException('Store not found.');
		}

		return store;
	}

	private async _ownCustomer(
		ownerUserId: string,
		customerId: string,
	): Promise<ICustomer> {
		const customer: ICustomer | null = mongoose.isValidObjectId(customerId)
			? await this._customerModel
					.findOne({ _id: customerId, ownerUserId })
					.lean<ICustomer>()
			: null;

		if (!customer) {
			throw new NotFoundException('Customer not found.');
		}

		return customer;
	}

	/** The customer's account: the one it is linked to, else the one with its e-mail. */
	private async _accountOf(customer: ICustomer): Promise<IUser | null> {
		const live = { 'softDelete.isDeleted': { $ne: true } };

		if (customer.userId) {
			const linked: IUser | null = await this._userModel
				.findOne({ _id: customer.userId, ...live })
				.lean<IUser>();

			if (linked) {
				return linked;
			}
		}

		const email: string = (customer.email ?? '').trim();

		if (!email) {
			return null;
		}

		return await this._userModel
			.findOne({ email: new RegExp(`^${escapeRegExp(email)}$`, 'i'), ...live })
			.lean<IUser>();
	}

	//#endregion
}
