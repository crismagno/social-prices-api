import { Injectable } from '@nestjs/common';

import { InboxConversationsService } from '../../inbox/inbox-conversations.service';
import { InboxMessagesService } from '../../inbox/inbox-messages.service';
import InboxEnum from '../../inbox/interfaces/inbox.enum';
import {
	IConversationKey,
	IInboxConversation,
	IInboxMessage,
} from '../../inbox/interfaces/inbox.types';
import { IMessengerMessageRecord } from './messenger-message.interface';
import { inboxInputOf, toMessengerMessage } from './messenger.inbox-mapper';
import {
	IMessengerLocalAttachment,
	INormalizedMessengerMessage,
} from './messenger.types';

export interface IOutgoingMessengerMessage {
	psid: string;
	mid: string;
	text: string | null;
	localAttachment?: IMessengerLocalAttachment;
	sentAt: Date;
	sentByEmployeeId: string | null;
}

const keyOf = (psid: string): IConversationKey => ({
	channel: InboxEnum.Channel.MESSENGER,
	contactKey: psid,
});

/**
 * The messages of the Messenger chats. They live in the central inbox, shared
 * with the other channels; this keeps the shape the Messenger app has always had.
 */
@Injectable()
export class MessengerMessagesService {
	constructor(
		private readonly _conversations: InboxConversationsService,
		private readonly _messages: InboxMessagesService,
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
		const conversation = await this._ensure(ownerUserId, message);

		return await this._messages.saveIncoming(
			ownerUserId,
			conversation,
			inboxInputOf({ ...message, isIncoming: true }),
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
		const { conversation } = await this._conversations.ensure(
			ownerUserId,
			keyOf(message.psid),
		);

		return toMessengerMessage(
			await this._messages.saveOutgoing(
				ownerUserId,
				conversation,
				inboxInputOf({ ...message, attachments: [] }),
			),
			message.psid,
		);
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
		const conversation = await this._ensure(ownerUserId, message);

		return await this._messages.saveEcho(
			ownerUserId,
			conversation,
			inboxInputOf(message),
		);
	}

	/** Removes it from the inbox; true when it was there. */
	public async deleteOwned(
		ownerUserId: string,
		psid: string,
		id: string,
	): Promise<boolean> {
		const conversation: IInboxConversation | null = await this._find(
			ownerUserId,
			psid,
		);

		return conversation
			? await this._messages.softDeleteOwned(ownerUserId, conversation._id, id)
			: false;
	}

	/** The newest message a conversation still has, if any. */
	public async findLatest(
		ownerUserId: string,
		psid: string,
	): Promise<IMessengerMessageRecord | null> {
		const conversation: IInboxConversation | null = await this._find(
			ownerUserId,
			psid,
		);

		if (!conversation) {
			return null;
		}

		const message: IInboxMessage | null = await this._messages.findLatest(
			ownerUserId,
			conversation._id,
		);

		return message ? toMessengerMessage(message, psid) : null;
	}

	/** One conversation, newest first. `before` is the id of the oldest one already loaded. */
	public async listByChat(
		ownerUserId: string,
		psid: string,
		options: { limit?: number; before?: string } = {},
	): Promise<IMessengerMessageRecord[]> {
		const conversation: IInboxConversation | null = await this._find(
			ownerUserId,
			psid,
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
		).map((message: IInboxMessage) => toMessengerMessage(message, psid));
	}

	public async findOwned(
		ownerUserId: string,
		psid: string,
		id: string,
	): Promise<IMessengerMessageRecord | null> {
		const conversation: IInboxConversation | null = await this._find(
			ownerUserId,
			psid,
		);

		if (!conversation) {
			return null;
		}

		const message: IInboxMessage | null = await this._messages.findOwned(
			ownerUserId,
			conversation._id,
			id,
		);

		return message ? toMessengerMessage(message, psid) : null;
	}

	private async _ensure(
		ownerUserId: string,
		message: INormalizedMessengerMessage,
	): Promise<IInboxConversation> {
		return (
			await this._conversations.ensure(ownerUserId, keyOf(message.psid), {
				accountKey: message.pageId,
			})
		).conversation;
	}

	private async _find(
		ownerUserId: string,
		psid: string,
	): Promise<IInboxConversation | null> {
		return await this._conversations.findByKey(ownerUserId, keyOf(psid));
	}
}
