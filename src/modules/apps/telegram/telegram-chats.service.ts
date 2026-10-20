import mongoose, { Model } from 'mongoose';

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../../infra/database/mongo/schemas';
import { ITelegramChat } from './telegram-chat.interface';
import { TelegramChat } from './telegram-chat.schema';
import { ITelegramMessageRecord } from './telegram-message.interface';
import TelegramEnum from './telegram.enum';
import { INormalizedTelegramMessage } from './telegram.types';

const PREVIEW_LENGTH: number = 200;
const MAX_CHATS: number = 200;

/**
 * The inbox: one entry per person, kept up to date as messages come and go so
 * listing it never has to read the messages themselves.
 */
@Injectable()
export class TelegramChatsService {
	constructor(
		@InjectModel(schemasName.telegramChat)
		private readonly _chatModel: Model<TelegramChat>,
	) {}

	/** True when this is the first time that person writes. */
	public async registerIncoming(
		ownerUserId: string,
		message: INormalizedTelegramMessage,
	): Promise<boolean> {
		const result = await this._chatModel.updateOne(
			{ ownerUserId, chatId: message.chatId },
			{
				$set: {
					telegramUserId: message.fromUserId,
					firstName: message.fromFirstName,
					lastName: message.fromLastName,
					username: message.fromUsername,
					languageCode: message.fromLanguageCode,
					lastMessageAt: message.sentAt,
					lastMessageText: this._preview(message.text, message.contentType),
					lastMessageDirection: TelegramEnum.Direction.IN,
					lastContentType: message.contentType,
				},
				$inc: { unreadCount: 1 },
				$setOnInsert: { customerId: null },
			},
			{ upsert: true },
		);

		return result.upsertedCount > 0;
	}

	/** After a message was deleted: the inbox shows what is now the newest one. */
	public async setLastMessage(
		ownerUserId: string,
		chatId: number,
		latest: ITelegramMessageRecord,
	): Promise<void> {
		await this._chatModel.updateOne(
			{ ownerUserId, chatId },
			{
				$set: {
					lastMessageAt: latest.sentAt,
					lastMessageText: this._preview(latest.text, latest.contentType),
					lastMessageDirection: latest.direction,
					lastContentType: latest.contentType,
				},
			},
		);
	}

	public async registerOutgoing(
		ownerUserId: string,
		chatId: number,
		text: string | null,
		at: Date,
		contentType: TelegramEnum.ContentType = TelegramEnum.ContentType.TEXT,
	): Promise<void> {
		await this._chatModel.updateOne(
			{ ownerUserId, chatId },
			{
				$set: {
					lastMessageAt: at,
					lastMessageText: this._preview(text, contentType),
					lastMessageDirection: TelegramEnum.Direction.OUT,
					lastContentType: contentType,
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

	public async markRead(ownerUserId: string, chatId: number): Promise<void> {
		await this._chatModel.updateOne(
			{ ownerUserId, chatId },
			{ $set: { unreadCount: 0 } },
		);
	}

	public async setCustomer(
		ownerUserId: string,
		chatId: number,
		customerId: string | null,
	): Promise<void> {
		await this._chatModel.updateOne(
			{ ownerUserId, chatId },
			{ $set: { customerId } },
		);
	}

	public async list(ownerUserId: string): Promise<ITelegramChat[]> {
		return await this._chatModel
			.find({ ownerUserId })
			.sort({ lastMessageAt: -1 })
			.limit(MAX_CHATS)
			.lean<ITelegramChat[]>();
	}

	public async findByChatId(
		ownerUserId: string,
		chatId: number,
	): Promise<ITelegramChat | null> {
		return await this._chatModel.findOne({ ownerUserId, chatId });
	}

	private _preview(
		text: string | null,
		contentType: TelegramEnum.ContentType,
	): string {
		return (text ?? `[${contentType}]`).slice(0, PREVIEW_LENGTH);
	}
}
