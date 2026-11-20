import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';

import {
	IInboxChannelAdapter,
	IInboxChannelCapabilities,
	IInboxReplyContext,
} from '../inbox/inbox-channel.adapter';
import { InboxChannelRegistry } from '../inbox/inbox-channel.registry';
import InboxEnum from '../inbox/interfaces/inbox.enum';
import {
	IInboxConversation,
	IInboxMessage,
} from '../inbox/interfaces/inbox.types';
import { StoreChatOwnerService } from './store-chat-owner.service';

/**
 * How the central inbox answers a customer account on the platform's own chat.
 * Text only for now, and with no answer window: nobody else's rules apply here.
 */
@Injectable()
export class StoreChatInboxAdapter
	implements IInboxChannelAdapter, OnModuleInit
{
	public readonly channel: InboxEnum.Channel = InboxEnum.Channel.STORE;
	public readonly capabilities: IInboxChannelCapabilities = {
		text: true,
		media: false,
		voice: false,
		maxUploadBytes: null,
		deleteMessage: false,
		answerWindowMs: null,
	};

	constructor(
		private readonly _registry: InboxChannelRegistry,
		private readonly _owner: StoreChatOwnerService,
	) {}

	public onModuleInit(): void {
		this._registry.register(this);
	}

	public canReply(): { allowed: boolean; windowEndsAt: Date | null } {
		return { allowed: true, windowEndsAt: null };
	}

	public async sendText(
		ctx: IInboxReplyContext,
		conversation: IInboxConversation,
		text: string,
	): Promise<IInboxMessage> {
		return await this._owner.sendText(ctx, conversation, text);
	}

	public async fetchAttachment(): Promise<{
		buffer: Buffer;
		contentType: string;
		fileName: string | null;
	}> {
		throw new NotFoundException('The store chat has no files.');
	}
}
