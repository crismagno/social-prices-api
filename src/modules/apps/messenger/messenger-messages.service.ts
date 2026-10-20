import { Model } from 'mongoose';

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../../infra/database/mongo/schemas';
import { IMessengerMessageRecord } from './messenger-message.interface';
import { MessengerMessage } from './messenger-message.schema';
import MessengerEnum from './messenger.enum';
import {
	IMessengerLocalAttachment,
	INormalizedMessengerMessage,
} from './messenger.types';

const DEFAULT_LIMIT: number = 50;
const MAX_LIMIT: number = 100;
const DUPLICATE_KEY_CODE: number = 11000;

export interface IOutgoingMessengerMessage {
	psid: string;
	mid: string;
	text: string | null;
	localAttachment?: IMessengerLocalAttachment;
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

	/**
	 * A file sent from here is stored before its echo, with no address. The echo is
	 * the first to bring it, so it completes the message that is already there.
	 */
	private async _fillAttachments(
		ownerUserId: string,
		message: INormalizedMessengerMessage,
	): Promise<void> {
		if (!message.attachments.length) {
			return;
		}

		await this._messageModel.updateOne(
			{ ownerUserId, mid: message.mid, attachments: { $size: 0 } },
			{
				$set: { attachments: message.attachments },
				$unset: { localAttachment: '' },
			},
		);
	}

	/**
	 * Stores a message of the Page that has its echo too: Facebook may echo it back
	 * before this runs, so a message that is already there only gains who sent it.
	 */
	public async saveOutgoing(
		ownerUserId: string,
		message: IOutgoingMessengerMessage,
	): Promise<IMessengerMessageRecord> {
		const saved = await this._messageModel.findOneAndUpdate(
			{ ownerUserId, mid: message.mid },
			{
				$setOnInsert: {
					direction: MessengerEnum.Direction.OUT,
					psid: message.psid,
					text: message.text,
					attachments: [],
					...(message.localAttachment
						? { localAttachment: message.localAttachment }
						: {}),
					sentAt: message.sentAt,
				},
				$set: { sentByEmployeeId: message.sentByEmployeeId },
			},
			{ upsert: true, new: true, setDefaultsOnInsert: true },
		);

		return saved as unknown as IMessengerMessageRecord;
	}

	/**
	 * Stores what the Page sent outside this system (Messenger, Business Suite).
	 * False means it was already stored, which is the normal echo of a message
	 * sent from here.
	 */
	public async saveEcho(
		ownerUserId: string,
		message: INormalizedMessengerMessage,
	): Promise<boolean> {
		try {
			await this._messageModel.create({
				ownerUserId,
				direction: MessengerEnum.Direction.OUT,
				psid: message.psid,
				mid: message.mid,
				text: message.text,
				attachments: message.attachments,
				sentAt: message.sentAt,
			});

			return true;
		} catch (error) {
			if ((error as { code?: number })?.code === DUPLICATE_KEY_CODE) {
				await this._fillAttachments(ownerUserId, message);

				return false;
			}

			throw error;
		}
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
