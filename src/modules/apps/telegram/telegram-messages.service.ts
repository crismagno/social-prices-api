import { Model } from 'mongoose';

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../../infra/database/mongo/schemas';
import { ITelegramMessageRecord } from './telegram-message.interface';
import { TelegramMessage } from './telegram-message.schema';
import TelegramEnum from './telegram.enum';
import { INormalizedTelegramMessage, ITelegramMedia } from './telegram.types';

const DEFAULT_LIMIT: number = 50;
const MAX_LIMIT: number = 100;
const DUPLICATE_KEY_CODE: number = 11000;

export interface IOutgoingTelegramMessage {
	chatId: number;
	messageId: number;
	text: string | null;
	contentType?: TelegramEnum.ContentType;
	media?: ITelegramMedia;
	sentAt: Date;
	sentByEmployeeId: string | null;
}

@Injectable()
export class TelegramMessagesService {
	constructor(
		@InjectModel(schemasName.telegramMessage)
		private readonly _messageModel: Model<TelegramMessage>,
	) {}

	/**
	 * Stores a customer's message. False means Telegram delivered the same message
	 * again, which is normal after a retry and nothing to worry about; any other
	 * failure is thrown so Telegram tries again.
	 */
	public async saveIncoming(
		ownerUserId: string,
		message: INormalizedTelegramMessage,
	): Promise<boolean> {
		try {
			await this._messageModel.create({
				ownerUserId,
				direction: TelegramEnum.Direction.IN,
				...message,
			});

			return true;
		} catch (error) {
			if ((error as { code?: number })?.code === DUPLICATE_KEY_CODE) {
				return false;
			}

			throw error;
		}
	}

	public async saveOutgoing(
		ownerUserId: string,
		message: IOutgoingTelegramMessage,
	): Promise<ITelegramMessageRecord> {
		const saved = await this._messageModel.create({
			ownerUserId,
			direction: TelegramEnum.Direction.OUT,
			chatId: message.chatId,
			messageId: message.messageId,
			contentType: message.contentType ?? TelegramEnum.ContentType.TEXT,
			text: message.text,
			...(message.media ? { media: message.media } : {}),
			sentAt: message.sentAt,
			sentByEmployeeId: message.sentByEmployeeId,
		});

		return saved as unknown as ITelegramMessageRecord;
	}

	public async findOwned(
		ownerUserId: string,
		chatId: number,
		id: string,
	): Promise<ITelegramMessageRecord | null> {
		return await this._messageModel
			.findOne({ _id: id, ownerUserId, chatId })
			.lean<ITelegramMessageRecord>();
	}

	public async deleteOwned(
		ownerUserId: string,
		chatId: number,
		id: string,
	): Promise<void> {
		await this._messageModel.deleteOne({ _id: id, ownerUserId, chatId });
	}

	/** The newest message a conversation still has, if any. */
	public async findLatest(
		ownerUserId: string,
		chatId: number,
	): Promise<ITelegramMessageRecord | null> {
		return await this._messageModel
			.findOne({ ownerUserId, chatId })
			.sort({ sentAt: -1, _id: -1 })
			.lean<ITelegramMessageRecord>();
	}

	/** One message of this owner's chat, as long as it has a file to give. */
	public async findWithMedia(
		ownerUserId: string,
		chatId: number,
		id: string,
	): Promise<ITelegramMessageRecord | null> {
		return await this._messageModel
			.findOne({
				_id: id,
				ownerUserId,
				chatId,
				'media.fileId': { $exists: true },
			})
			.lean<ITelegramMessageRecord>();
	}

	/** One conversation, newest first. `before` is the id of the oldest one already loaded. */
	public async listByChat(
		ownerUserId: string,
		chatId: number,
		options: { limit?: number; before?: string } = {},
	): Promise<ITelegramMessageRecord[]> {
		const wanted: number = Number.isFinite(options.limit)
			? Math.min(MAX_LIMIT, Math.max(1, Math.floor(options.limit)))
			: DEFAULT_LIMIT;

		return await this._messageModel
			.find({
				ownerUserId,
				chatId,
				...(options.before ? { _id: { $lt: options.before } } : {}),
			})
			.sort({ _id: -1 })
			.limit(wanted)
			.lean<ITelegramMessageRecord[]>();
	}
}
