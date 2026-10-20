import mongoose, { Model } from 'mongoose';

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../infra/database/mongo/schemas';
import { InboxMessage } from './inbox-message.schema';
import InboxEnum from './interfaces/inbox.enum';
import { IInboxMessage, IInboxMessageInput } from './interfaces/inbox.types';

const DEFAULT_LIMIT: number = 50;
const MAX_LIMIT: number = 100;
const DUPLICATE_KEY_CODE: number = 11000;

/** The conversation a message belongs to: enough to store it. */
export interface IInboxConversationRef {
	_id: string;
	channel: InboxEnum.Channel;
}

/**
 * The messages of every channel, in one shape. A message is told apart by the
 * channel's own id within its conversation, so a repeated delivery is harmless.
 */
@Injectable()
export class InboxMessagesService {
	constructor(
		@InjectModel(schemasName.inboxMessage)
		private readonly _messageModel: Model<InboxMessage>,
	) {}

	//#region Writing

	/**
	 * Stores a customer's message. False means the channel delivered the same
	 * message again, which is normal after a retry; any other failure is thrown so
	 * the channel tries again.
	 */
	public async saveIncoming(
		ownerUserId: string,
		conversation: IInboxConversationRef,
		input: IInboxMessageInput,
	): Promise<boolean> {
		return await this._create(
			ownerUserId,
			conversation,
			InboxEnum.Direction.IN,
			false,
			input,
		);
	}

	/**
	 * Stores a reply sent from here. The channel may echo it back before this
	 * runs, so a message that is already there only gains who sent it.
	 */
	public async saveOutgoing(
		ownerUserId: string,
		conversation: IInboxConversationRef,
		input: IInboxMessageInput,
	): Promise<IInboxMessage> {
		// Who sent it goes in `$set` (a message echoed first only gains it), so it
		// must stay out of `$setOnInsert`: Mongo refuses one path in both.
		const onInsert: Record<string, unknown> = this._document(
			ownerUserId,
			conversation,
			InboxEnum.Direction.OUT,
			false,
			input,
		);

		delete onInsert.sentByEmployeeId;

		const saved = await this._messageModel.findOneAndUpdate(
			{
				ownerUserId,
				conversationId: conversation._id,
				channelMessageId: input.channelMessageId,
				direction: InboxEnum.Direction.OUT,
			},
			{
				$setOnInsert: onInsert,
				$set: { sentByEmployeeId: input.sentByEmployeeId ?? null },
			},
			{ upsert: true, new: true, setDefaultsOnInsert: true },
		);

		return saved as unknown as IInboxMessage;
	}

	/**
	 * Stores what the account sent outside this system (the channel's own app).
	 * False means it was already stored, which is the normal echo of a reply sent
	 * from here; if that one was stored without its file's address, the echo
	 * completes it.
	 */
	public async saveEcho(
		ownerUserId: string,
		conversation: IInboxConversationRef,
		input: IInboxMessageInput,
	): Promise<boolean> {
		const created: boolean = await this._create(
			ownerUserId,
			conversation,
			InboxEnum.Direction.OUT,
			true,
			input,
		);

		if (!created && input.attachments.length) {
			await this._messageModel.updateOne(
				{
					ownerUserId,
					conversationId: conversation._id,
					channelMessageId: input.channelMessageId,
					direction: InboxEnum.Direction.OUT,
					attachments: { $size: 0 },
				},
				{
					$set: { attachments: input.attachments },
					$unset: { 'channelData.localAttachment': '' },
				},
			);
		}

		return created;
	}

	public async deleteOwned(
		ownerUserId: string,
		conversationId: string,
		id: string,
	): Promise<void> {
		await this._messageModel.deleteOne({
			_id: id,
			ownerUserId,
			conversationId,
		});
	}

	/**
	 * Takes a message out of the inbox without forgetting it: the channel may
	 * deliver it again, and the same id must not bring it back. True when it was
	 * there to remove.
	 */
	public async softDeleteOwned(
		ownerUserId: string,
		conversationId: string,
		id: string,
	): Promise<boolean> {
		if (!mongoose.isValidObjectId(id)) {
			return false;
		}

		const result = await this._messageModel.updateOne(
			{ _id: id, ownerUserId, conversationId, deletedAt: null },
			{ $set: { deletedAt: new Date() } },
		);

		return result.modifiedCount > 0;
	}

	//#endregion

	//#region Reading

	/** One conversation, newest first. `before` is the id of the oldest one already loaded. */
	public async listByConversation(
		ownerUserId: string,
		conversationId: string,
		options: { limit?: number; before?: string } = {},
	): Promise<IInboxMessage[]> {
		return await this._messageModel
			.find({
				ownerUserId,
				conversationId,
				deletedAt: null,
				...(options.before ? { _id: { $lt: options.before } } : {}),
			})
			.sort({ _id: -1 })
			.limit(this._limit(options.limit))
			.lean<IInboxMessage[]>();
	}

	/**
	 * Several conversations as one thread (what a customer has on every channel):
	 * newest first by when each was sent. `before` is the id of the oldest message
	 * already loaded; older means sent earlier, or sent at the same time with a
	 * smaller id.
	 */
	public async listTimeline(
		ownerUserId: string,
		conversationIds: string[],
		options: { limit?: number; before?: string } = {},
	): Promise<IInboxMessage[]> {
		if (!conversationIds.length) {
			return [];
		}

		const pivot: IInboxMessage | null =
			options.before && mongoose.isValidObjectId(options.before)
				? await this._messageModel
						.findOne({ _id: options.before, ownerUserId })
						.lean<IInboxMessage>()
				: null;

		return await this._messageModel
			.find({
				ownerUserId,
				conversationId: { $in: conversationIds },
				deletedAt: null,
				...(pivot
					? {
							$or: [
								{ sentAt: { $lt: pivot.sentAt } },
								{ sentAt: pivot.sentAt, _id: { $lt: pivot._id } },
							],
					  }
					: {}),
			})
			.sort({ sentAt: -1, _id: -1 })
			.limit(this._limit(options.limit))
			.lean<IInboxMessage[]>();
	}

	public async findOwned(
		ownerUserId: string,
		conversationId: string,
		id: string,
	): Promise<IInboxMessage | null> {
		return await this._messageModel
			.findOne({ _id: id, ownerUserId, conversationId, deletedAt: null })
			.lean<IInboxMessage>();
	}

	/** A message of this owner, whichever conversation it is in. */
	public async findById(
		ownerUserId: string,
		id: string,
	): Promise<IInboxMessage | null> {
		if (!mongoose.isValidObjectId(id)) {
			return null;
		}

		return await this._messageModel
			.findOne({ _id: id, ownerUserId, deletedAt: null })
			.lean<IInboxMessage>();
	}

	/** The newest message a conversation still has, if any. */
	public async findLatest(
		ownerUserId: string,
		conversationId: string,
	): Promise<IInboxMessage | null> {
		return await this._messageModel
			.findOne({ ownerUserId, conversationId, deletedAt: null })
			.sort({ sentAt: -1, _id: -1 })
			.lean<IInboxMessage>();
	}

	//#endregion

	//#region Private Methods

	private async _create(
		ownerUserId: string,
		conversation: IInboxConversationRef,
		direction: InboxEnum.Direction,
		isEcho: boolean,
		input: IInboxMessageInput,
	): Promise<boolean> {
		try {
			await this._messageModel.create(
				this._document(ownerUserId, conversation, direction, isEcho, input),
			);

			return true;
		} catch (error) {
			if ((error as { code?: number })?.code === DUPLICATE_KEY_CODE) {
				return false;
			}

			throw error;
		}
	}

	private _document(
		ownerUserId: string,
		conversation: IInboxConversationRef,
		direction: InboxEnum.Direction,
		isEcho: boolean,
		input: IInboxMessageInput,
	) {
		return {
			ownerUserId,
			conversationId: conversation._id,
			channel: conversation.channel,
			direction,
			channelMessageId: input.channelMessageId,
			kind: input.kind,
			text: input.text,
			attachments: input.attachments,
			sender: input.sender ?? null,
			sentAt: input.sentAt,
			receivedAt: new Date(),
			sentByEmployeeId: input.sentByEmployeeId ?? null,
			isEcho,
			isUnsupported: input.isUnsupported ?? false,
			channelData: input.channelData ?? null,
			raw: input.raw ?? null,
		};
	}

	private _limit(requested: number | undefined): number {
		return Number.isFinite(requested)
			? Math.min(MAX_LIMIT, Math.max(1, Math.floor(requested)))
			: DEFAULT_LIMIT;
	}

	//#endregion
}
