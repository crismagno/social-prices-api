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
import { MAX_MESSENGER_UPLOAD_BYTES } from './messenger-chat.dto';
import { REPLY_WINDOW_MS, MessengerService } from './messenger.service';

/** How the central inbox reaches the Messenger account: answers and files. */
@Injectable()
export class MessengerInboxAdapter
	implements IInboxChannelAdapter, OnModuleInit
{
	public readonly channel: InboxEnum.Channel = InboxEnum.Channel.MESSENGER;
	public readonly capabilities: IInboxChannelCapabilities = {
		text: true,
		media: true,
		voice: true,
		maxUploadBytes: MAX_MESSENGER_UPLOAD_BYTES,
		deleteMessage: true,
		answerWindowMs: REPLY_WINDOW_MS,
	};

	constructor(
		private readonly _registry: InboxChannelRegistry,
		private readonly _service: MessengerService,
		private readonly _messages: InboxMessagesService,
	) {}

	public onModuleInit(): void {
		this._registry.register(this);
	}

	/** Only for 24 hours after the person last wrote. */
	public canReply(conversation: IInboxConversation): {
		allowed: boolean;
		windowEndsAt: Date | null;
	} {
		const windowEndsAt: Date = new Date(
			new Date(conversation.lastIncomingAt).getTime() + REPLY_WINDOW_MS,
		);

		return { allowed: windowEndsAt.getTime() > Date.now(), windowEndsAt };
	}

	public async sendText(
		ctx: IInboxReplyContext,
		conversation: IInboxConversation,
		text: string,
	): Promise<IInboxMessage> {
		const sent = await this._service.sendMessage(
			ctx,
			conversation.contactKey,
			text,
		);

		return await this._messages.findById(ctx.ownerUserId, sent._id);
	}

	/** A file carries no caption on Messenger, so the text goes as a message right after it. */
	public async sendMedia(
		ctx: IInboxReplyContext,
		conversation: IInboxConversation,
		file: IInboxUploadFile,
		options: { caption: string | null; asVoice: boolean },
	): Promise<IInboxMessage> {
		const sent = await this._service.sendAttachment(
			ctx,
			conversation.contactKey,
			file,
		);

		if (options.caption) {
			await this._service.sendMessage(
				ctx,
				conversation.contactKey,
				options.caption,
			);
		}

		return await this._messages.findById(ctx.ownerUserId, sent._id);
	}

	public async sendTyping(
		ctx: IInboxReplyContext,
		conversation: IInboxConversation,
	): Promise<void> {
		await this._service.sendTyping(ctx, conversation.contactKey);
	}

	public async deleteMessage(
		ownerUserId: string,
		conversation: IInboxConversation,
		message: IInboxMessage,
	): Promise<void> {
		await this._service.deleteMessage(
			ownerUserId,
			conversation.contactKey,
			String(message._id),
		);
	}

	public async fetchAttachment(
		ownerUserId: string,
		conversation: IInboxConversation,
		message: IInboxMessage,
		index: number,
	): Promise<{ buffer: Buffer; contentType: string; fileName: string | null }> {
		const file = await this._service.getAttachment(
			ownerUserId,
			conversation.contactKey,
			String(message._id),
			index,
		);

		return { ...file, fileName: null };
	}
}
