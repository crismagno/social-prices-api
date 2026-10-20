import mongoose, { Model } from 'mongoose';

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../infra/database/mongo/schemas';
import { InboxConversation } from './inbox-conversation.schema';
import InboxEnum from './interfaces/inbox.enum';
import {
	IConversationKey,
	IInboxContact,
	IInboxConversation,
	IInboxPreview,
} from './interfaces/inbox.types';

const PREVIEW_LENGTH: number = 200;
const MAX_CONVERSATIONS: number = 200;

const EMPTY_CONTACT: IInboxContact = {
	name: null,
	username: null,
	profilePic: null,
	languageCode: null,
	extra: {},
};

/**
 * The conversations of every channel, kept up to date as messages come and go so
 * listing them never has to read the messages themselves. One person on one
 * channel is one conversation; it can be tied to a customer and moved to another.
 */
@Injectable()
export class InboxConversationsService {
	constructor(
		@InjectModel(schemasName.inboxConversation)
		private readonly _conversationModel: Model<InboxConversation>,
	) {}

	//#region Writing

	/** Finds the conversation, making it first if it does not exist. Nothing else is touched. */
	public async ensure(
		ownerUserId: string,
		key: IConversationKey,
		init: { accountKey?: string | null; contact?: Partial<IInboxContact> } = {},
	): Promise<{ conversation: IInboxConversation; created: boolean }> {
		const filter = { ownerUserId, ...key };

		const result = await this._conversationModel.updateOne(
			filter,
			{
				$setOnInsert: {
					accountKey: init.accountKey ?? null,
					contact: { ...EMPTY_CONTACT, ...init.contact },
					customerId: null,
					customerChangedAt: null,
					lastMessageAt: null,
					lastIncomingAt: new Date(0),
					unreadCount: 0,
				},
			},
			{ upsert: true },
		);

		return {
			conversation: (await this._conversationModel.findOne(
				filter,
			)) as unknown as IInboxConversation,
			created: result.upsertedCount > 0,
		};
	}

	/**
	 * A customer message arrived: the preview moves, the answer window opens and
	 * one more is unread. True when it was the first message of that person.
	 */
	public async applyIncoming(
		ownerUserId: string,
		conversationId: string,
		input: {
			preview: IInboxPreview;
			accountKey?: string | null;
			contact?: Partial<IInboxContact>;
		},
	): Promise<boolean> {
		const before = await this._conversationModel.findOneAndUpdate(
			{ _id: conversationId, ownerUserId },
			{
				$set: {
					...(input.accountKey !== undefined
						? { accountKey: input.accountKey }
						: {}),
					...this._contactPatch(input.contact),
					...this._previewFields(input.preview),
					lastIncomingAt: input.preview.at,
				},
				$inc: { unreadCount: 1 },
			},
			{ returnDocument: 'before' },
		);

		return !before?.lastMessageAt;
	}

	/**
	 * Something the account sent from outside this system. It is a message sent,
	 * so nothing is unread and the answer window is not touched. An echo that
	 * arrives late must not overwrite a newer last message.
	 */
	public async applyEcho(
		ownerUserId: string,
		conversationId: string,
		preview: IInboxPreview,
	): Promise<void> {
		await this._conversationModel.updateOne(
			{
				_id: conversationId,
				ownerUserId,
				$or: [{ lastMessageAt: null }, { lastMessageAt: { $lte: preview.at } }],
			},
			{ $set: this._previewFields(preview) },
		);
	}

	public async applyOutgoing(
		ownerUserId: string,
		conversationId: string,
		preview: IInboxPreview,
	): Promise<void> {
		await this.setPreview(ownerUserId, conversationId, preview);
	}

	/** After a message was deleted: the inbox shows what is now the newest one. */
	public async setPreview(
		ownerUserId: string,
		conversationId: string,
		preview: IInboxPreview,
	): Promise<void> {
		await this._conversationModel.updateOne(
			{ _id: conversationId, ownerUserId },
			{ $set: this._previewFields(preview) },
		);
	}

	public async setContact(
		ownerUserId: string,
		conversationId: string,
		contact: Partial<IInboxContact>,
	): Promise<void> {
		await this._conversationModel.updateOne(
			{ _id: conversationId, ownerUserId },
			{ $set: this._contactPatch(contact) },
		);
	}

	public async markRead(
		ownerUserId: string,
		conversationId: string,
	): Promise<void> {
		await this._conversationModel.updateOne(
			{ _id: conversationId, ownerUserId },
			{ $set: { unreadCount: 0 } },
		);
	}

	/** Ties the conversation to a customer, or to none. The messages go with it: nothing is copied. */
	public async setCustomer(
		ownerUserId: string,
		conversationId: string,
		customerId: string | null,
	): Promise<void> {
		await this._conversationModel.updateOne(
			{ _id: conversationId, ownerUserId },
			{ $set: { customerId, customerChangedAt: new Date() } },
		);
	}

	//#endregion

	//#region Reading

	public async findByKey(
		ownerUserId: string,
		key: IConversationKey,
	): Promise<IInboxConversation | null> {
		return (await this._conversationModel.findOne({
			ownerUserId,
			...key,
		})) as unknown as IInboxConversation | null;
	}

	/** A conversation of this owner, or null: a malformed id never reaches the database as a cast error. */
	public async findById(
		ownerUserId: string,
		conversationId: string,
	): Promise<IInboxConversation | null> {
		if (!mongoose.isValidObjectId(conversationId)) {
			return null;
		}

		return (await this._conversationModel.findOne({
			_id: conversationId,
			ownerUserId,
		})) as unknown as IInboxConversation | null;
	}

	public async listByChannel(
		ownerUserId: string,
		channel: InboxEnum.Channel,
	): Promise<IInboxConversation[]> {
		return await this._list({ ownerUserId, channel });
	}

	/** Every conversation of the owner that has a message, most recent first. */
	public async listAll(ownerUserId: string): Promise<IInboxConversation[]> {
		return await this._list({ ownerUserId });
	}

	public async listByCustomer(
		ownerUserId: string,
		customerId: string,
	): Promise<IInboxConversation[]> {
		return await this._list({ ownerUserId, customerId });
	}

	public async listUnassigned(
		ownerUserId: string,
	): Promise<IInboxConversation[]> {
		return await this._list({ ownerUserId, customerId: null });
	}

	/** Messages waiting to be read, over the owner's conversations, of one channel or of all. */
	public async countUnread(
		ownerUserId: string,
		channel?: InboxEnum.Channel,
	): Promise<number> {
		const [result] = await this._conversationModel.aggregate([
			{
				$match: {
					ownerUserId: new mongoose.Types.ObjectId(ownerUserId),
					...(channel ? { channel } : {}),
				},
			},
			{ $group: { _id: null, total: { $sum: '$unreadCount' } } },
		]);

		return result?.total ?? 0;
	}

	//#endregion

	//#region Private Methods

	/** A conversation that never got a message has nothing to show yet. */
	private async _list(
		filter: Record<string, unknown>,
	): Promise<IInboxConversation[]> {
		return await this._conversationModel
			.find({ ...filter, lastMessageAt: { $ne: null } })
			.sort({ lastMessageAt: -1 })
			.limit(MAX_CONVERSATIONS)
			.lean<IInboxConversation[]>();
	}

	private _previewFields(preview: IInboxPreview) {
		return {
			lastMessageAt: preview.at,
			lastMessageText:
				preview.text === null ? null : preview.text.slice(0, PREVIEW_LENGTH),
			lastMessageKind: preview.kind,
			lastMessageChannelKind: preview.channelKind,
			lastMessageDirection: preview.direction,
		};
	}

	/** Field by field, so what was not given is left as it was. */
	private _contactPatch(
		contact: Partial<IInboxContact> | undefined,
	): Record<string, unknown> {
		return Object.fromEntries(
			Object.entries(contact ?? {})
				.filter(([, value]) => value !== undefined)
				.map(([field, value]) => [`contact.${field}`, value]),
		);
	}

	//#endregion
}
