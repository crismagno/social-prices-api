import { Injectable, OnModuleInit } from '@nestjs/common';

import {
	IInboxChannelAdapter,
	IInboxChannelCapabilities,
	IInboxUploadFile,
	IInboxReplyContext,
} from '../../inbox/inbox-channel.adapter';
import { InboxChannelRegistry } from '../../inbox/inbox-channel.registry';
import { InboxMessagesService } from '../../inbox/inbox-messages.service';
import InboxEnum from '../../inbox/interfaces/inbox.enum';
import {
	IInboxConversation,
	IInboxMessage,
} from '../../inbox/interfaces/inbox.types';
import { MAX_TELEGRAM_UPLOAD_BYTES } from './telegram-chat.dto';
import { ITelegramMessageRecord } from './telegram-message.interface';
import { TelegramService } from './telegram.service';

/** How the central inbox reaches the Telegram bot: answers and files. */
@Injectable()
export class TelegramInboxAdapter
	implements IInboxChannelAdapter, OnModuleInit
{
	public readonly channel: InboxEnum.Channel = InboxEnum.Channel.TELEGRAM;
	public readonly capabilities: IInboxChannelCapabilities = {
		text: true,
		media: true,
		voice: true,
		maxUploadBytes: MAX_TELEGRAM_UPLOAD_BYTES,
		deleteMessage: true,
		answerWindowMs: null,
	};

	constructor(
		private readonly _registry: InboxChannelRegistry,
		private readonly _telegramService: TelegramService,
		private readonly _messages: InboxMessagesService,
	) {}

	public onModuleInit(): void {
		this._registry.register(this);
	}

	/** A bot can write to anyone who wrote to it, whenever it wants. */
	public canReply(): { allowed: boolean; windowEndsAt: Date | null } {
		return { allowed: true, windowEndsAt: null };
	}

	public async sendText(
		ctx: IInboxReplyContext,
		conversation: IInboxConversation,
		text: string,
	): Promise<IInboxMessage> {
		const sent: ITelegramMessageRecord =
			await this._telegramService.sendMessage(
				ctx,
				Number(conversation.contactKey),
				text,
			);

		return await this._messages.findById(ctx.ownerUserId, sent._id);
	}

	public async sendTyping(
		ctx: IInboxReplyContext,
		conversation: IInboxConversation,
	): Promise<void> {
		await this._telegramService.sendTyping(
			ctx,
			Number(conversation.contactKey),
		);
	}

	public async sendMedia(
		ctx: IInboxReplyContext,
		conversation: IInboxConversation,
		file: IInboxUploadFile,
		options: { caption: string | null; asVoice: boolean },
	): Promise<IInboxMessage> {
		const sent: ITelegramMessageRecord = await this._telegramService.sendMedia(
			ctx,
			Number(conversation.contactKey),
			file,
			options.caption,
			options.asVoice,
		);

		return await this._messages.findById(ctx.ownerUserId, sent._id);
	}

	public async deleteMessage(
		ownerUserId: string,
		conversation: IInboxConversation,
		message: IInboxMessage,
	): Promise<void> {
		await this._telegramService.deleteMessage(
			ownerUserId,
			Number(conversation.contactKey),
			String(message._id),
		);
	}

	public async fetchAttachment(
		ownerUserId: string,
		conversation: IInboxConversation,
		message: IInboxMessage,
	): Promise<{ buffer: Buffer; contentType: string; fileName: string | null }> {
		const media = await this._telegramService.getMedia(
			ownerUserId,
			Number(conversation.contactKey),
			String(message._id),
		);

		return {
			buffer: media.buffer,
			contentType: media.mimeType,
			fileName: media.fileName,
		};
	}
}
