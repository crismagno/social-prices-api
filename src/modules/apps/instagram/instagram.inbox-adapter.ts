import { Injectable, OnModuleInit } from '@nestjs/common';

import {
	IInboxChannelAdapter,
	IInboxChannelCapabilities,
	IInboxReplyContext,
} from '../../inbox/inbox-channel.adapter';
import { InboxChannelRegistry } from '../../inbox/inbox-channel.registry';
import { InboxMessagesService } from '../../inbox/inbox-messages.service';
import InboxEnum from '../../inbox/interfaces/inbox.enum';
import {
	IInboxConversation,
	IInboxMessage,
} from '../../inbox/interfaces/inbox.types';
import { REPLY_WINDOW_MS, InstagramService } from './instagram.service';

/** How the central inbox reaches the Instagram account: answers and files. */
@Injectable()
export class InstagramInboxAdapter
	implements IInboxChannelAdapter, OnModuleInit
{
	public readonly channel: InboxEnum.Channel = InboxEnum.Channel.INSTAGRAM;
	public readonly capabilities: IInboxChannelCapabilities = {
		text: true,
		media: false,
		voice: false,
		answerWindowMs: REPLY_WINDOW_MS,
	};

	constructor(
		private readonly _registry: InboxChannelRegistry,
		private readonly _service: InstagramService,
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
