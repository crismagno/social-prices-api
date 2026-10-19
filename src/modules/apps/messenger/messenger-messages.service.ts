import { Model } from 'mongoose';

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../../infra/database/mongo/schemas';
import { IMessengerMessageRecord } from './messenger-message.interface';
import { MessengerMessage } from './messenger-message.schema';
import MessengerEnum from './messenger.enum';
import { INormalizedMessengerMessage } from './messenger.types';

const DEFAULT_LIMIT: number = 50;
const MAX_LIMIT: number = 100;
const DUPLICATE_KEY_CODE: number = 11000;

export interface IOutgoingMessengerMessage {
	psid: string;
	mid: string;
	text: string;
	sentAt: Date;
	sentByEmployeeId: string | null;
}

@Injectable()
export class MessengerMessagesService {
	constructor(
		@InjectModel(schemasName.messengerMessage)
		private readonly _messageModel: Model<MessengerMessage>,
	) {}

	/**
	 * Stores a customer's message. False means Facebook delivered the same message
	 * again, which is normal after a retry; any other failure is thrown so
	 * Facebook tries again.
	 */
	public async saveIncoming(
		ownerUserId: string,
		message: INormalizedMessengerMessage,
	): Promise<boolean> {
		try {
			await this._messageModel.create({
				ownerUserId,
				direction: MessengerEnum.Direction.IN,
				psid: message.psid,
				mid: message.mid,
				text: message.text,
				attachments: message.attachments,
				sentAt: message.sentAt,
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
		message: IOutgoingMessengerMessage,
	): Promise<IMessengerMessageRecord> {
		const saved = await this._messageModel.create({
			ownerUserId,
			direction: MessengerEnum.Direction.OUT,
			psid: message.psid,
			mid: message.mid,
			text: message.text,
			attachments: [],
			sentAt: message.sentAt,
			sentByEmployeeId: message.sentByEmployeeId,
		});

		return saved as unknown as IMessengerMessageRecord;
	}

	/** One conversation, newest first. `before` is the id of the oldest one already loaded. */
	public async listByChat(
		ownerUserId: string,
		psid: string,
		options: { limit?: number; before?: string } = {},
	): Promise<IMessengerMessageRecord[]> {
		const wanted: number = Number.isFinite(options.limit)
			? Math.min(MAX_LIMIT, Math.max(1, Math.floor(options.limit)))
			: DEFAULT_LIMIT;

		return await this._messageModel
			.find({
				ownerUserId,
				psid,
				...(options.before ? { _id: { $lt: options.before } } : {}),
			})
			.sort({ _id: -1 })
			.limit(wanted)
			.lean<IMessengerMessageRecord[]>();
	}

	public async findOwned(
		ownerUserId: string,
		psid: string,
		id: string,
	): Promise<IMessengerMessageRecord | null> {
		return await this._messageModel
			.findOne({ _id: id, ownerUserId, psid })
			.lean<IMessengerMessageRecord>();
	}
}
