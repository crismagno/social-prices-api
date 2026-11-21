import { Injectable, OnModuleInit } from '@nestjs/common';

import {
	IInboxChannelAdapter,
	IInboxChannelCapabilities,
	IInboxReplyContext,
	IInboxUploadFile,
} from '../inbox/inbox-channel.adapter';
import { InboxChannelRegistry } from '../inbox/inbox-channel.registry';
import InboxEnum from '../inbox/interfaces/inbox.enum';
import {
	IInboxConversation,
	IInboxMessage,
} from '../inbox/interfaces/inbox.types';
import { StoreChatOwnerService } from './store-chat-owner.service';
import { STORE_CHAT_MAX_UPLOAD_BYTES } from './store-chat.constants';

/**
 * How the central inbox answers a customer account on the platform's own chat.
 * Texts, files and recordings, with no answer window: nobody else's rules
 * apply here.
 * A message the store wrote can be removed, or have its words changed, for
 * both sides.
 */
@Injectable()
export class StoreChatInboxAdapter
	implements IInboxChannelAdapter, OnModuleInit
{
	public readonly channel: InboxEnum.Channel = InboxEnum.Channel.STORE;
	public readonly capabilities: IInboxChannelCapabilities = {
		text: true,
		media: true,
		voice: true,
		maxUploadBytes: STORE_CHAT_MAX_UPLOAD_BYTES,
		deleteMessage: true,
		editMessage: true,
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

	/** Only what the store itself wrote: the customer's messages are the customer's. */
	public canDeleteMessage(message: IInboxMessage): boolean {
		return message.direction === InboxEnum.Direction.OUT;
	}

	public async deleteMessage(
		_ownerUserId: string,
		conversation: IInboxConversation,
		message: IInboxMessage,
	): Promise<void> {
		await this._owner.deleteMessage(conversation, message);
	}

	/** Only what the store itself wrote, and never something it could not read. */
	public canEditMessage(message: IInboxMessage): boolean {
		return (
			message.direction === InboxEnum.Direction.OUT && !message.isUnsupported
		);
	}

	public async editMessage(
		_ownerUserId: string,
		conversation: IInboxConversation,
		message: IInboxMessage,
		text: string,
	): Promise<IInboxMessage> {
		return await this._owner.editMessage(conversation, message, text);
	}

	public async sendTyping(
		_ctx: IInboxReplyContext,
		conversation: IInboxConversation,
	): Promise<void> {
		this._owner.typing(conversation);
	}

	public async sendMedia(
		ctx: IInboxReplyContext,
		conversation: IInboxConversation,
		file: IInboxUploadFile,
		options: { caption: string | null; asVoice: boolean },
	): Promise<IInboxMessage> {
		return await this._owner.sendMedia(ctx, conversation, file, options);
	}

	public async fetchAttachment(
		_ownerUserId: string,
		_conversation: IInboxConversation,
		message: IInboxMessage,
		index: number,
	): Promise<{ buffer: Buffer; contentType: string; fileName: string | null }> {
		return await this._owner.getAttachment(message, index);
	}
}
