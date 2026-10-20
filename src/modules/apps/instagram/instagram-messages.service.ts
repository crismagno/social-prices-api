import { Model } from 'mongoose';

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../../infra/database/mongo/schemas';
import { IInstagramMessageRecord } from './instagram-message.interface';
import { InstagramMessage } from './instagram-message.schema';
import InstagramEnum from './instagram.enum';
import { INormalizedInstagramMessage } from './instagram.types';

const DEFAULT_LIMIT: number = 50;
const MAX_LIMIT: number = 100;
const DUPLICATE_KEY_CODE: number = 11000;

export interface IOutgoingInstagramMessage {
	igsid: string;
	mid: string;
	text: string;
	sentAt: Date;
	sentByEmployeeId: string | null;
}

@Injectable()
export class InstagramMessagesService {
	constructor(
		@InjectModel(schemasName.instagramMessage)
		private readonly _messageModel: Model<InstagramMessage>,
	) {}

	/**
	 * Stores a customer's message. False means Instagram delivered the same message
	 * again, which is normal after a retry; any other failure is thrown so
	 * Instagram tries again.
	 */
	public async saveIncoming(
		ownerUserId: string,
		message: INormalizedInstagramMessage,
	): Promise<boolean> {
		return await this._create(ownerUserId, InstagramEnum.Direction.IN, message);
	}

	/**
	 * Stores a reply sent from here. Instagram may echo it back before this runs,
	 * so a message that is already there only gains who sent it.
	 */
	public async saveOutgoing(
		ownerUserId: string,
		message: IOutgoingInstagramMessage,
	): Promise<IInstagramMessageRecord> {
		const saved = await this._messageModel.findOneAndUpdate(
			{ ownerUserId, mid: message.mid },
			{
				$setOnInsert: {
					direction: InstagramEnum.Direction.OUT,
					igsid: message.igsid,
					text: message.text,
					attachments: [],
					sentAt: message.sentAt,
				},
				$set: { sentByEmployeeId: message.sentByEmployeeId },
			},
			{ upsert: true, new: true, setDefaultsOnInsert: true },
		);

		return saved as unknown as IInstagramMessageRecord;
	}

	/**
	 * Stores what the account sent outside this system (the Instagram app). False
	 * means it was already stored, which is the normal echo of a reply sent from
	 * here.
	 */
	public async saveEcho(
		ownerUserId: string,
		message: INormalizedInstagramMessage,
	): Promise<boolean> {
		return await this._create(
			ownerUserId,
			InstagramEnum.Direction.OUT,
			message,
		);
	}

	/** One conversation, newest first. `before` is the id of the oldest one already loaded. */
	public async listByChat(
		ownerUserId: string,
		igsid: string,
		options: { limit?: number; before?: string } = {},
	): Promise<IInstagramMessageRecord[]> {
		const wanted: number = Number.isFinite(options.limit)
			? Math.min(MAX_LIMIT, Math.max(1, Math.floor(options.limit)))
			: DEFAULT_LIMIT;

		return await this._messageModel
			.find({
				ownerUserId,
				igsid,
				...(options.before ? { _id: { $lt: options.before } } : {}),
			})
			.sort({ _id: -1 })
			.limit(wanted)
			.lean<IInstagramMessageRecord[]>();
	}

	public async findOwned(
		ownerUserId: string,
		igsid: string,
		id: string,
	): Promise<IInstagramMessageRecord | null> {
		return await this._messageModel
			.findOne({ _id: id, ownerUserId, igsid })
			.lean<IInstagramMessageRecord>();
	}

	private async _create(
		ownerUserId: string,
		direction: InstagramEnum.Direction,
		message: INormalizedInstagramMessage,
	): Promise<boolean> {
		try {
			await this._messageModel.create({
				ownerUserId,
				direction,
				igsid: message.igsid,
				mid: message.mid,
				text: message.text,
				attachments: message.attachments,
				isUnsupported: message.isUnsupported,
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
}
