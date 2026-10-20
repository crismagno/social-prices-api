import { Injectable } from '@nestjs/common';

import { InboxConversationsService } from '../../inbox/inbox-conversations.service';
import InboxEnum from '../../inbox/interfaces/inbox.enum';
import {
	IConversationKey,
	IInboxConversation,
} from '../../inbox/interfaces/inbox.types';
import { IInstagramChat } from './instagram-chat.interface';
import { IInstagramMessageRecord } from './instagram-message.interface';
import InstagramEnum from './instagram.enum';
import {
	attachmentTypeOf,
	contactOf,
	previewOf,
	toInstagramChat,
} from './instagram.inbox-mapper';
import {
	IInstagramProfile,
	INormalizedInstagramMessage,
} from './instagram.types';

const keyOf = (igsid: string): IConversationKey => ({
	channel: InboxEnum.Channel.INSTAGRAM,
	contactKey: igsid,
});

/**
 * The Instagram inbox: one row per person who wrote to the account. The
 * conversations live in the central inbox, shared with the other channels; this
 * keeps the shape the Instagram app has always had.
 */
@Injectable()
export class InstagramChatsService {
	constructor(private readonly _conversations: InboxConversationsService) {}

	/** True when this is the first time that person writes. */
	public async registerIncoming(
		ownerUserId: string,
		message: INormalizedInstagramMessage,
	): Promise<boolean> {
		const { conversation } = await this._conversations.ensure(
			ownerUserId,
			keyOf(message.igsid),
			{ accountKey: message.accountId },
		);

		return await this._conversations.applyIncoming(
			ownerUserId,
			conversation._id,
			{
				accountKey: message.accountId,
				preview: previewOf(
					message.text,
					attachmentTypeOf(message),
					InstagramEnum.Direction.IN,
					message.sentAt,
				),
			},
		);
	}

	/**
	 * The account wrote to a person from outside this system (the Instagram app).
	 * It is a message sent, so nothing is unread and the answer window is not
	 * touched; a conversation that starts this way has no window open. True when
	 * this made the conversation.
	 */
	public async registerEcho(
		ownerUserId: string,
		message: INormalizedInstagramMessage,
	): Promise<boolean> {
		const { conversation } = await this._conversations.ensure(
			ownerUserId,
			keyOf(message.igsid),
			{ accountKey: message.accountId },
		);

		await this._conversations.applyEcho(
			ownerUserId,
			conversation._id,
			previewOf(
				message.text,
				attachmentTypeOf(message),
				InstagramEnum.Direction.OUT,
				message.sentAt,
			),
		);

		// The message may already be stored, so "new" means it had no last message.
		return !conversation.lastMessageAt;
	}

	/** After a message was removed: the inbox shows what is now the newest one. */
	public async setLastMessage(
		ownerUserId: string,
		igsid: string,
		latest: IInstagramMessageRecord,
	): Promise<void> {
		const conversation: IInboxConversation | null = await this._find(
			ownerUserId,
			igsid,
		);

		if (conversation) {
			await this._conversations.setPreview(
				ownerUserId,
				conversation._id,
				previewOf(
					latest.text,
					attachmentTypeOf({
						attachments: latest.attachments,
						isUnsupported: latest.isUnsupported ?? false,
					}),
					latest.direction,
					latest.sentAt,
				),
			);
		}
	}

	public async registerOutgoing(
		ownerUserId: string,
		igsid: string,
		text: string,
		at: Date,
	): Promise<void> {
		const conversation: IInboxConversation | null = await this._find(
			ownerUserId,
			igsid,
		);

		if (conversation) {
			await this._conversations.applyOutgoing(
				ownerUserId,
				conversation._id,
				previewOf(text, null, InstagramEnum.Direction.OUT, at),
			);
		}
	}

	public async setProfile(
		ownerUserId: string,
		igsid: string,
		profile: IInstagramProfile,
	): Promise<void> {
		const conversation: IInboxConversation | null = await this._find(
			ownerUserId,
			igsid,
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
			InboxEnum.Channel.INSTAGRAM,
		);
	}

	public async markRead(ownerUserId: string, igsid: string): Promise<void> {
		const conversation: IInboxConversation | null = await this._find(
			ownerUserId,
			igsid,
		);

		if (conversation) {
			await this._conversations.markRead(ownerUserId, conversation._id);
		}
	}

	public async setCustomer(
		ownerUserId: string,
		igsid: string,
		customerId: string | null,
	): Promise<void> {
		const conversation: IInboxConversation | null = await this._find(
			ownerUserId,
			igsid,
		);

		if (conversation) {
			await this._conversations.setCustomer(
				ownerUserId,
				conversation._id,
				customerId,
			);
		}
	}

	public async list(ownerUserId: string): Promise<IInstagramChat[]> {
		return (
			await this._conversations.listByChannel(
				ownerUserId,
				InboxEnum.Channel.INSTAGRAM,
			)
		).map(toInstagramChat);
	}

	public async findByIgsid(
		ownerUserId: string,
		igsid: string,
	): Promise<IInstagramChat | null> {
		const conversation: IInboxConversation | null = await this._find(
			ownerUserId,
			igsid,
		);

		return conversation ? toInstagramChat(conversation) : null;
	}

	private async _find(
		ownerUserId: string,
		igsid: string,
	): Promise<IInboxConversation | null> {
		return await this._conversations.findByKey(ownerUserId, keyOf(igsid));
	}
}
