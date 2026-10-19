import { Model } from 'mongoose';

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

	public async registerOutgoing(
		ownerUserId: string,
		psid: string,
		text: string,
		at: Date,
	): Promise<void> {
		await this._chatModel.updateOne(
			{ ownerUserId, psid },
			{
				$set: {
					lastMessageAt: at,
					lastMessageText: this._preview(text),
					lastAttachmentType: null,
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
