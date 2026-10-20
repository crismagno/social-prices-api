import mongoose, { Model } from 'mongoose';

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../../infra/database/mongo/schemas';
import { IInstagramChat } from './instagram-chat.interface';
import { InstagramChat } from './instagram-chat.schema';
import InstagramEnum from './instagram.enum';
import {
	IInstagramProfile,
	INormalizedInstagramMessage,
} from './instagram.types';

const PREVIEW_LENGTH: number = 120;
const MAX_CHATS: number = 200;

/** The inbox: one row per person who wrote to the account. */
@Injectable()
export class InstagramChatsService {
	constructor(
		@InjectModel(schemasName.instagramChat)
		private readonly _chatModel: Model<InstagramChat>,
	) {}

	/** True when this is the first time that person writes. */
	public async registerIncoming(
		ownerUserId: string,
		message: INormalizedInstagramMessage,
	): Promise<boolean> {
		const result = await this._chatModel.updateOne(
			{ ownerUserId, igsid: message.igsid },
			{
				$set: {
					accountId: message.accountId,
					lastMessageAt: message.sentAt,
					lastMessageText: this._preview(message.text),
					lastAttachmentType: this._attachmentTypeOf(message),
					lastMessageDirection: InstagramEnum.Direction.IN,
					lastIncomingAt: message.sentAt,
				},
				$inc: { unreadCount: 1 },
				$setOnInsert: {
					customerId: null,
					name: null,
					username: null,
					profilePic: null,
				},
			},
			{ upsert: true },
		);

		return result.upsertedCount > 0;
	}

	/**
	 * The account wrote to a person from outside this system (the Instagram app). It is a message sent, so
	 * nothing is unread and the answer window is not touched; a conversation that
	 * starts this way has no window open. True when this made the conversation.
	 */
	public async registerEcho(
		ownerUserId: string,
		message: INormalizedInstagramMessage,
	): Promise<boolean> {
		const preview = {
			lastMessageAt: message.sentAt,
			lastMessageText: this._preview(message.text),
			lastAttachmentType: this._attachmentTypeOf(message),
			lastMessageDirection: InstagramEnum.Direction.OUT,
		};

		const created = await this._chatModel.updateOne(
			{ ownerUserId, igsid: message.igsid },
			{
				$setOnInsert: {
					accountId: message.accountId,
					customerId: null,
					name: null,
					username: null,
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
				igsid: message.igsid,
				lastMessageAt: { $lte: message.sentAt },
			},
			{ $set: preview },
		);

		return false;
	}

	public async registerOutgoing(
		ownerUserId: string,
		igsid: string,
		text: string,
		at: Date,
	): Promise<void> {
		await this._chatModel.updateOne(
			{ ownerUserId, igsid },
			{
				$set: {
					lastMessageAt: at,
					lastMessageText: this._preview(text),
					lastAttachmentType: null,
					lastMessageDirection: InstagramEnum.Direction.OUT,
				},
			},
		);
	}

	public async setProfile(
		ownerUserId: string,
		igsid: string,
		profile: IInstagramProfile,
	): Promise<void> {
		await this._chatModel.updateOne(
			{ ownerUserId, igsid },
			{
				$set: {
					name: profile.name,
					username: profile.username,
					profilePic: profile.profilePic,
				},
			},
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

	public async markRead(ownerUserId: string, igsid: string): Promise<void> {
		await this._chatModel.updateOne(
			{ ownerUserId, igsid },
			{ $set: { unreadCount: 0 } },
		);
	}

	public async setCustomer(
		ownerUserId: string,
		igsid: string,
		customerId: string | null,
	): Promise<void> {
		await this._chatModel.updateOne(
			{ ownerUserId, igsid },
			{ $set: { customerId } },
		);
	}

	public async list(ownerUserId: string): Promise<IInstagramChat[]> {
		return await this._chatModel
			.find({ ownerUserId })
			.sort({ lastMessageAt: -1 })
			.limit(MAX_CHATS)
			.lean<IInstagramChat[]>();
	}

	public async findByIgsid(
		ownerUserId: string,
		igsid: string,
	): Promise<IInstagramChat | null> {
		return await this._chatModel.findOne({ ownerUserId, igsid });
	}

	private _preview(text: string | null): string | null {
		return text === null ? null : text.slice(0, PREVIEW_LENGTH);
	}

	/** What the last message was, when it has no text to show: a file, or something unsupported. */
	private _attachmentTypeOf(
		message: INormalizedInstagramMessage,
	): string | null {
		return (
			message.attachments[0]?.type ??
			(message.isUnsupported ? 'unsupported' : null)
		);
	}
}
