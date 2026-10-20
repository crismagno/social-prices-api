import { Injectable } from '@nestjs/common';

import { InboxConversationsService } from '../../inbox/inbox-conversations.service';
import { InboxMessagesService } from '../../inbox/inbox-messages.service';
import InboxEnum from '../../inbox/interfaces/inbox.enum';
import {
	IConversationKey,
	IInboxConversation,
	IInboxMessage,
} from '../../inbox/interfaces/inbox.types';
import { IInstagramMessageRecord } from './instagram-message.interface';
import { inboxInputOf, toInstagramMessage } from './instagram.inbox-mapper';
import { INormalizedInstagramMessage } from './instagram.types';

export interface IOutgoingInstagramMessage {
	igsid: string;
	mid: string;
	text: string;
	sentAt: Date;
	sentByEmployeeId: string | null;
}

const keyOf = (igsid: string): IConversationKey => ({
	channel: InboxEnum.Channel.INSTAGRAM,
	contactKey: igsid,
});

/**
 * The messages of the Instagram chats. They live in the central inbox, shared
 * with the other channels; this keeps the shape the Instagram app has always had.
 */
@Injectable()
export class InstagramMessagesService {
	constructor(
		private readonly _conversations: InboxConversationsService,
		private readonly _messages: InboxMessagesService,
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
		return await this._messages.saveIncoming(
			ownerUserId,
			await this._ensure(ownerUserId, message),
			inboxInputOf({ ...message, isIncoming: true }),
		);
	}

	/**
	 * Stores a reply sent from here. Instagram may echo it back before this runs,
	 * so a message that is already there only gains who sent it.
	 */
	public async saveOutgoing(
		ownerUserId: string,
		message: IOutgoingInstagramMessage,
	): Promise<IInstagramMessageRecord> {
		const { conversation } = await this._conversations.ensure(
			ownerUserId,
			keyOf(message.igsid),
		);

		return toInstagramMessage(
			await this._messages.saveOutgoing(
				ownerUserId,
				conversation,
				inboxInputOf({ ...message, attachments: [], isUnsupported: false }),
			),
			message.igsid,
		);
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
		return await this._messages.saveEcho(
			ownerUserId,
			await this._ensure(ownerUserId, message),
			inboxInputOf(message),
		);
	}

	/** One conversation, newest first. `before` is the id of the oldest one already loaded. */
	public async listByChat(
		ownerUserId: string,
		igsid: string,
		options: { limit?: number; before?: string } = {},
	): Promise<IInstagramMessageRecord[]> {
		const conversation: IInboxConversation | null = await this._find(
			ownerUserId,
			igsid,
		);

		if (!conversation) {
			return [];
		}

		return (
			await this._messages.listByConversation(
				ownerUserId,
				conversation._id,
				options,
			)
		).map((message: IInboxMessage) => toInstagramMessage(message, igsid));
	}

	public async findOwned(
		ownerUserId: string,
		igsid: string,
		id: string,
	): Promise<IInstagramMessageRecord | null> {
		const conversation: IInboxConversation | null = await this._find(
			ownerUserId,
			igsid,
		);

		if (!conversation) {
			return null;
		}

		const message: IInboxMessage | null = await this._messages.findOwned(
			ownerUserId,
			conversation._id,
			id,
		);

		return message ? toInstagramMessage(message, igsid) : null;
	}

	private async _ensure(
		ownerUserId: string,
		message: INormalizedInstagramMessage,
	): Promise<IInboxConversation> {
		return (
			await this._conversations.ensure(ownerUserId, keyOf(message.igsid), {
				accountKey: message.accountId,
			})
		).conversation;
	}

	private async _find(
		ownerUserId: string,
		igsid: string,
	): Promise<IInboxConversation | null> {
		return await this._conversations.findByKey(ownerUserId, keyOf(igsid));
	}
}
