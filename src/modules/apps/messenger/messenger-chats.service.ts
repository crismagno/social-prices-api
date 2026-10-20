import { Injectable } from '@nestjs/common';

import { InboxConversationsService } from '../../inbox/inbox-conversations.service';
import InboxEnum from '../../inbox/interfaces/inbox.enum';
import {
	IConversationKey,
	IInboxConversation,
} from '../../inbox/interfaces/inbox.types';
import { IMessengerChat } from './messenger-chat.interface';
import { IMessengerMessageRecord } from './messenger-message.interface';
import MessengerEnum from './messenger.enum';
import {
	contactOf,
	previewOf,
	toMessengerChat,
} from './messenger.inbox-mapper';
import { IMetaProfile, INormalizedMessengerMessage } from './messenger.types';

const keyOf = (psid: string): IConversationKey => ({
	channel: InboxEnum.Channel.MESSENGER,
	contactKey: psid,
});

/**
 * The Messenger inbox: one row per person who wrote to the Page. The
 * conversations live in the central inbox, shared with the other channels; this
 * keeps the shape the Messenger app has always had.
 */
@Injectable()
export class MessengerChatsService {
	constructor(private readonly _conversations: InboxConversationsService) {}

	/** True when this is the first time that person writes. */
	public async registerIncoming(
		ownerUserId: string,
		message: INormalizedMessengerMessage,
	): Promise<boolean> {
		const { conversation } = await this._conversations.ensure(
			ownerUserId,
			keyOf(message.psid),
			{ accountKey: message.pageId },
		);

		return await this._conversations.applyIncoming(
			ownerUserId,
			conversation._id,
			{
				accountKey: message.pageId,
				preview: previewOf(
					message.text,
					message.attachments[0]?.type ?? null,
					MessengerEnum.Direction.IN,
					message.sentAt,
				),
			},
		);
	}

	/**
	 * The Page wrote to a person from outside this system. It is a message sent, so
	 * nothing is unread and the answer window is not touched; a conversation that
	 * starts this way has no window open. True when this made the conversation.
	 */
	public async registerEcho(
		ownerUserId: string,
		message: INormalizedMessengerMessage,
	): Promise<boolean> {
		const { conversation } = await this._conversations.ensure(
			ownerUserId,
			keyOf(message.psid),
			{ accountKey: message.pageId },
		);

		await this._conversations.applyEcho(
			ownerUserId,
			conversation._id,
			previewOf(
				message.text,
				message.attachments[0]?.type ?? null,
				MessengerEnum.Direction.OUT,
				message.sentAt,
			),
		);

		// The message may already be stored, so "new" means it had no last message.
		return !conversation.lastMessageAt;
	}

	/** After a message was removed: the inbox shows what is now the newest one. */
	public async setLastMessage(
		ownerUserId: string,
		psid: string,
		latest: IMessengerMessageRecord,
	): Promise<void> {
		const conversation: IInboxConversation | null = await this._find(
			ownerUserId,
			psid,
		);

		if (conversation) {
			await this._conversations.setPreview(
				ownerUserId,
				conversation._id,
				previewOf(
					latest.text,
					latest.attachments[0]?.type ?? latest.localAttachment?.type ?? null,
					latest.direction,
					latest.sentAt,
				),
			);
		}
	}

	public async registerOutgoing(
		ownerUserId: string,
		psid: string,
		text: string | null,
		at: Date,
		attachmentType: string | null = null,
	): Promise<void> {
		const conversation: IInboxConversation | null = await this._find(
			ownerUserId,
			psid,
		);

		if (conversation) {
			await this._conversations.applyOutgoing(
				ownerUserId,
				conversation._id,
				previewOf(text, attachmentType, MessengerEnum.Direction.OUT, at),
			);
		}
	}

	public async setProfile(
		ownerUserId: string,
		psid: string,
		profile: IMetaProfile,
	): Promise<void> {
		const conversation: IInboxConversation | null = await this._find(
			ownerUserId,
			psid,
		);

		if (conversation) {
			await this._conversations.setContact(
				ownerUserId,
				conversation._id,
				contactOf(profile),
			);
		}
	}

	/** Messages waiting to be read, over every conversation of the owner. */
	public async countUnread(ownerUserId: string): Promise<number> {
		return await this._conversations.countUnread(
			ownerUserId,
			InboxEnum.Channel.MESSENGER,
		);
	}

	public async markRead(ownerUserId: string, psid: string): Promise<void> {
		const conversation: IInboxConversation | null = await this._find(
			ownerUserId,
			psid,
		);

		if (conversation) {
			await this._conversations.markRead(ownerUserId, conversation._id);
		}
	}

	public async setCustomer(
		ownerUserId: string,
		psid: string,
		customerId: string | null,
	): Promise<void> {
		const conversation: IInboxConversation | null = await this._find(
			ownerUserId,
			psid,
		);

		if (conversation) {
			await this._conversations.setCustomer(
				ownerUserId,
				conversation._id,
				customerId,
			);
		}
	}

	public async list(ownerUserId: string): Promise<IMessengerChat[]> {
		return (
			await this._conversations.listByChannel(
				ownerUserId,
				InboxEnum.Channel.MESSENGER,
			)
		).map(toMessengerChat);
	}

	public async findByPsid(
		ownerUserId: string,
		psid: string,
	): Promise<IMessengerChat | null> {
		const conversation: IInboxConversation | null = await this._find(
			ownerUserId,
			psid,
		);

		return conversation ? toMessengerChat(conversation) : null;
	}

	private async _find(
		ownerUserId: string,
		psid: string,
	): Promise<IInboxConversation | null> {
		return await this._conversations.findByKey(ownerUserId, keyOf(psid));
	}
}
