import mongoose, { Model } from 'mongoose';

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../../infra/database/mongo/schemas';
import { IMessengerChat } from './messenger-chat.interface';
import { MessengerChat } from './messenger-chat.schema';
import MessengerEnum from './messenger.enum';
import { IMetaProfile, INormalizedMessengerMessage } from './messenger.types';

const PREVIEW_LENGTH: number = 120;
const MAX_CHATS: number = 200;

/** The inbox: one row per person who wrote to the Page. */
@Injectable()
export class MessengerChatsService {
	constructor(
		@InjectModel(schemasName.messengerChat)
		private readonly _chatModel: Model<MessengerChat>,
	) {}

	/** True when this is the first time that person writes. */
	public async registerIncoming(
		ownerUserId: string,
		message: INormalizedMessengerMessage,
	): Promise<boolean> {
		const result = await this._chatModel.updateOne(
			{ ownerUserId, psid: message.psid },
			{
				$set: {
					pageId: message.pageId,
					lastMessageAt: message.sentAt,
					lastMessageText: this._preview(message.text),
					lastAttachmentType: message.attachments[0]?.type ?? null,
					lastMessageDirection: MessengerEnum.Direction.IN,
					lastIncomingAt: message.sentAt,
				},
				$inc: { unreadCount: 1 },
				$setOnInsert: { customerId: null, name: null, profilePic: null },
			},
			{ upsert: true },
		);

		return result.upsertedCount > 0;
	}

	/**
	 * The Page wrote to a person from outside this system. It is a message sent, so
	 * nothing is unread and the answer window is not touched; a conversation that
	 * starts this way has no window open. True when this made the conversation.
	 */
	public async registerEcho(
		ownerUserId: string,
		message: INormalizedMessengerMessage,
	): Promise<boolean> {
		const preview = {
			lastMessageAt: message.sentAt,
			lastMessageText: this._preview(message.text),
			lastAttachmentType: message.attachments[0]?.type ?? null,
			lastMessageDirection: MessengerEnum.Direction.OUT,
		};

		const created = await this._chatModel.updateOne(
			{ ownerUserId, psid: message.psid },
			{
				$setOnInsert: {
					pageId: message.pageId,
					customerId: null,
					name: null,
					profilePic: null,
					unreadCount: 0,
					lastIncomingAt: new Date(0),
					...preview,
				},
			},
			{ upsert: true },
		);

		if (created.upsertedCount > 0) {
			return true;
		}

		// An echo that arrives late must not overwrite a newer last message.
		await this._chatModel.updateOne(
			{
				ownerUserId,
				psid: message.psid,
				lastMessageAt: { $lte: message.sentAt },
			},
			{ $set: preview },
		);

		return false;
	}

	public async registerOutgoing(
		ownerUserId: string,
		psid: string,
		text: string | null,
		at: Date,
		attachmentType: string | null = null,
	): Promise<void> {
		await this._chatModel.updateOne(
			{ ownerUserId, psid },
			{
				$set: {
					lastMessageAt: at,
					lastMessageText: this._preview(text),
					lastAttachmentType: attachmentType,
					lastMessageDirection: MessengerEnum.Direction.OUT,
				},
			},
		);
	}

	public async setProfile(
		ownerUserId: string,
		psid: string,
		profile: IMetaProfile,
	): Promise<void> {
		await this._chatModel.updateOne(
			{ ownerUserId, psid },
			{ $set: { name: profile.name, profilePic: profile.profilePic } },
		);
	}

	/** Messages waiting to be read, over every conversation of the owner. */
	public async countUnread(ownerUserId: string): Promise<number> {
		const [result] = await this._chatModel.aggregate([
			{ $match: { ownerUserId: new mongoose.Types.ObjectId(ownerUserId) } },
			{ $group: { _id: null, total: { $sum: '$unreadCount' } } },
		]);

		return result?.total ?? 0;
	}

	public async markRead(ownerUserId: string, psid: string): Promise<void> {
		await this._chatModel.updateOne(
			{ ownerUserId, psid },
			{ $set: { unreadCount: 0 } },
		);
	}

	public async setCustomer(
		ownerUserId: string,
		psid: string,
		customerId: string | null,
	): Promise<void> {
		await this._chatModel.updateOne(
			{ ownerUserId, psid },
			{ $set: { customerId } },
		);
	}

	public async list(ownerUserId: string): Promise<IMessengerChat[]> {
		return await this._chatModel
			.find({ ownerUserId })
			.sort({ lastMessageAt: -1 })
			.limit(MAX_CHATS)
			.lean<IMessengerChat[]>();
	}

	public async findByPsid(
		ownerUserId: string,
		psid: string,
	): Promise<IMessengerChat | null> {
		return await this._chatModel.findOne({ ownerUserId, psid });
	}

	private _preview(text: string | null): string | null {
		return text === null ? null : text.slice(0, PREVIEW_LENGTH);
	}
}
