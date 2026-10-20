import { Injectable } from '@nestjs/common';

import { InboxConversationsService } from '../../inbox/inbox-conversations.service';
import InboxEnum from '../../inbox/interfaces/inbox.enum';
import {
	IConversationKey,
	IInboxConversation,
} from '../../inbox/interfaces/inbox.types';
import { ITelegramChat } from './telegram-chat.interface';
import { ITelegramMessageRecord } from './telegram-message.interface';
import TelegramEnum from './telegram.enum';
import { contactOf, previewOf, toTelegramChat } from './telegram.inbox-mapper';
import { INormalizedTelegramMessage } from './telegram.types';

const keyOf = (chatId: number): IConversationKey => ({
	channel: InboxEnum.Channel.TELEGRAM,
	contactKey: String(chatId),
});

/**
 * The Telegram inbox: one entry per person. The conversations live in the
 * central inbox, shared with the other channels; this keeps the shape the
 * Telegram app has always had.
 */
@Injectable()
export class TelegramChatsService {
	constructor(private readonly _conversations: InboxConversationsService) {}

	/** True when this is the first time that person writes. */
	public async registerIncoming(
		ownerUserId: string,
		message: INormalizedTelegramMessage,
	): Promise<boolean> {
		const { conversation } = await this._conversations.ensure(
			ownerUserId,
			keyOf(message.chatId),
			{ contact: contactOf(message) },
		);

		return await this._conversations.applyIncoming(
			ownerUserId,
			conversation._id,
			{
				preview: previewOf(
					message.text,
					message.contentType,
					TelegramEnum.Direction.IN,
					message.sentAt,
				),
				contact: contactOf(message),
			},
		);
	}

	/** After a message was deleted: the inbox shows what is now the newest one. */
	public async setLastMessage(
		ownerUserId: string,
		chatId: number,
		latest: ITelegramMessageRecord,
	): Promise<void> {
		const conversation: IInboxConversation | null = await this._find(
			ownerUserId,
			chatId,
		);

		if (conversation) {
			await this._conversations.setPreview(
				ownerUserId,
				conversation._id,
				previewOf(
					latest.text,
					latest.contentType,
					latest.direction,
					latest.sentAt,
				),
			);
		}
	}

	public async registerOutgoing(
		ownerUserId: string,
		chatId: number,
		text: string | null,
		at: Date,
		contentType: TelegramEnum.ContentType = TelegramEnum.ContentType.TEXT,
	): Promise<void> {
		const conversation: IInboxConversation | null = await this._find(
			ownerUserId,
			chatId,
		);

		if (conversation) {
			await this._conversations.applyOutgoing(
				ownerUserId,
				conversation._id,
				previewOf(text, contentType, TelegramEnum.Direction.OUT, at),
			);
		}
	}

	/** Messages waiting to be read, over every conversation of the owner. */
	public async countUnread(ownerUserId: string): Promise<number> {
		return await this._conversations.countUnread(
			ownerUserId,
			InboxEnum.Channel.TELEGRAM,
		);
	}

	public async markRead(ownerUserId: string, chatId: number): Promise<void> {
		const conversation: IInboxConversation | null = await this._find(
			ownerUserId,
			chatId,
		);

		if (conversation) {
			await this._conversations.markRead(ownerUserId, conversation._id);
		}
	}

	public async setCustomer(
		ownerUserId: string,
		chatId: number,
		customerId: string | null,
	): Promise<void> {
		const conversation: IInboxConversation | null = await this._find(
			ownerUserId,
			chatId,
		);

		if (conversation) {
			await this._conversations.setCustomer(
				ownerUserId,
				conversation._id,
				customerId,
			);
		}
	}

	public async list(ownerUserId: string): Promise<ITelegramChat[]> {
		return (
			await this._conversations.listByChannel(
				ownerUserId,
				InboxEnum.Channel.TELEGRAM,
			)
		).map(toTelegramChat);
	}

	public async findByChatId(
		ownerUserId: string,
		chatId: number,
	): Promise<ITelegramChat | null> {
		const conversation: IInboxConversation | null = await this._find(
			ownerUserId,
			chatId,
		);

		return conversation ? toTelegramChat(conversation) : null;
	}

	private async _find(
		ownerUserId: string,
		chatId: number,
	): Promise<IInboxConversation | null> {
		return await this._conversations.findByKey(ownerUserId, keyOf(chatId));
	}
}
