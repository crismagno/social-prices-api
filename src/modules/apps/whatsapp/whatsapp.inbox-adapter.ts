import { Injectable, OnModuleInit } from '@nestjs/common';

import {
	IInboxChannelAdapter,
	IInboxChannelCapabilities,
	IInboxReplyContext,
	IInboxUploadFile,
} from '../../inbox/inbox-channel.adapter';
import { InboxChannelRegistry } from '../../inbox/inbox-channel.registry';
import InboxEnum from '../../inbox/interfaces/inbox.enum';
import {
	IInboxConversation,
	IInboxMessage,
} from '../../inbox/interfaces/inbox.types';
import { REPLY_WINDOW_MS, WhatsappService } from './whatsapp.service';

// WhatsApp takes up to 16 MB of video or audio, and less for pictures; one limit
// that suits all is the smallest of the big ones.
const MAX_UPLOAD_BYTES: number = 16 * 1024 * 1024;

/** How the central inbox reaches the user's WhatsApp number: answers and files. */
@Injectable()
export class WhatsappInboxAdapter
	implements IInboxChannelAdapter, OnModuleInit
{
	public readonly channel: InboxEnum.Channel = InboxEnum.Channel.WHATSAPP;
	public readonly capabilities: IInboxChannelCapabilities = {
		text: true,
		media: true,
		voice: true,
		answerWindowMs: REPLY_WINDOW_MS,
		maxUploadBytes: MAX_UPLOAD_BYTES,
		// WhatsApp has no way to delete a message.
		deleteMessage: false,
	};

	constructor(
		private readonly _registry: InboxChannelRegistry,
		private readonly _service: WhatsappService,
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
		return await this._service.sendText(ctx, conversation.contactKey, text);
	}

	public async sendMedia(
		ctx: IInboxReplyContext,
		conversation: IInboxConversation,
		file: IInboxUploadFile,
		options: { caption: string | null; asVoice: boolean },
	): Promise<IInboxMessage> {
		return await this._service.sendMedia(
			ctx,
			conversation.contactKey,
			file,
			options.caption,
			options.asVoice,
		);
	}

	public async fetchAttachment(
		ownerUserId: string,
		_conversation: IInboxConversation,
		message: IInboxMessage,
		index: number,
	): Promise<{ buffer: Buffer; contentType: string; fileName: string | null }> {
		return await this._service.getAttachment(ownerUserId, message, index);
	}
}
