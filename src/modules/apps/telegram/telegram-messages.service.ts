import { Injectable } from '@nestjs/common';

import { InboxConversationsService } from '../../inbox/inbox-conversations.service';
import { InboxMessagesService } from '../../inbox/inbox-messages.service';
import InboxEnum from '../../inbox/interfaces/inbox.enum';
import {
	IConversationKey,
	IInboxConversation,
	IInboxMessage,
} from '../../inbox/interfaces/inbox.types';
import { ITelegramMessageRecord } from './telegram-message.interface';
import TelegramEnum from './telegram.enum';
import {
	contactOf,
	inboxInputOf,
	toTelegramMessage,
} from './telegram.inbox-mapper';
import { INormalizedTelegramMessage, ITelegramMedia } from './telegram.types';

export interface IOutgoingTelegramMessage {
	chatId: number;
	messageId: number;
	text: string | null;
	contentType?: TelegramEnum.ContentType;
	media?: ITelegramMedia;
	sentAt: Date;
	sentByEmployeeId: string | null;
}

const keyOf = (chatId: number): IConversationKey => ({
	channel: InboxEnum.Channel.TELEGRAM,
	contactKey: String(chatId),
});

/**
 * The messages of the Telegram chats. They live in the central inbox, shared with
 * the other channels; this keeps the shape the Telegram app has always had.
 */
@Injectable()
export class TelegramMessagesService {
	constructor(
		private readonly _conversations: InboxConversationsService,
		private readonly _messages: InboxMessagesService,
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
		const { conversation } = await this._conversations.ensure(
			ownerUserId,
			keyOf(message.chatId),
			{ contact: contactOf(message) },
		);

		return await this._messages.saveIncoming(
			ownerUserId,
			conversation,
			inboxInputOf(message),
		);
	}

	public async saveOutgoing(
		ownerUserId: string,
		message: IOutgoingTelegramMessage,
	): Promise<ITelegramMessageRecord> {
		const { conversation } = await this._conversations.ensure(
			ownerUserId,
			keyOf(message.chatId),
		);

		return toTelegramMessage(
			await this._messages.saveOutgoing(
				ownerUserId,
				conversation,
				inboxInputOf(message as any),
			),
			message.chatId,
		);
	}

	public async findOwned(
		ownerUserId: string,
		chatId: number,
		id: string,
	): Promise<ITelegramMessageRecord | null> {
		const conversation: IInboxConversation | null = await this._find(
			ownerUserId,
			chatId,
		);

		if (!conversation) {
			return null;
		}

		const message: IInboxMessage | null = await this._messages.findOwned(
			ownerUserId,
			conversation._id,
			id,
		);

		return message ? toTelegramMessage(message, chatId) : null;
	}

	public async deleteOwned(
		ownerUserId: string,
		chatId: number,
		id: string,
	): Promise<void> {
		const conversation: IInboxConversation | null = await this._find(
			ownerUserId,
			chatId,
		);

		if (conversation) {
			await this._messages.deleteOwned(ownerUserId, conversation._id, id);
		}
	}

	/** The newest message a conversation still has, if any. */
	public async findLatest(
		ownerUserId: string,
		chatId: number,
	): Promise<ITelegramMessageRecord | null> {
		const conversation: IInboxConversation | null = await this._find(
			ownerUserId,
			chatId,
		);

		if (!conversation) {
			return null;
		}

		const message: IInboxMessage | null = await this._messages.findLatest(
			ownerUserId,
			conversation._id,
		);

		return message ? toTelegramMessage(message, chatId) : null;
	}

	/** One message of this owner's chat, as long as it has a file to give. */
	public async findWithMedia(
		ownerUserId: string,
		chatId: number,
		id: string,
	): Promise<ITelegramMessageRecord | null> {
		const record: ITelegramMessageRecord | null = await this.findOwned(
			ownerUserId,
			chatId,
			id,
		);

		return record?.media ? record : null;
	}

	/** One conversation, newest first. `before` is the id of the oldest one already loaded. */
	public async listByChat(
		ownerUserId: string,
		chatId: number,
		options: { limit?: number; before?: string } = {},
	): Promise<ITelegramMessageRecord[]> {
		const conversation: IInboxConversation | null = await this._find(
			ownerUserId,
			chatId,
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
		).map((message: IInboxMessage) => toTelegramMessage(message, chatId));
	}

	private async _find(
		ownerUserId: string,
		chatId: number,
	): Promise<IInboxConversation | null> {
		return await this._conversations.findByKey(ownerUserId, keyOf(chatId));
	}
}
