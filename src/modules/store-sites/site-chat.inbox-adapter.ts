import mongoose from 'mongoose';

import { Injectable, OnModuleInit } from '@nestjs/common';

import {
	IInboxChannelAdapter,
	IInboxChannelCapabilities,
	IInboxReplyContext,
	IInboxUploadFile,
} from '../inbox/inbox-channel.adapter';
import { InboxChannelRegistry } from '../inbox/inbox-channel.registry';
import { InboxConversationsService } from '../inbox/inbox-conversations.service';
import { InboxMessagesService } from '../inbox/inbox-messages.service';
import InboxEnum from '../inbox/interfaces/inbox.enum';
import {
	IInboxAttachment,
	IInboxConversation,
	IInboxMessage,
	IInboxMessageInput,
} from '../inbox/interfaces/inbox.types';
import { SiteChatTypingState } from './site-chat-typing';
import { StoreChatMediaService } from '../store-chat/store-chat-media.service';
import { StoreChatDeletionService } from '../store-chat/store-chat-deletion.service';
import { StoreChatEditionService } from '../store-chat/store-chat-edition.service';
import { STORE_CHAT_MAX_UPLOAD_BYTES } from '../store-chat/store-chat.constants';
import { storeChatText } from '../store-chat/store-chat.service';

/**
 * How the central inbox answers a visitor of a store's site: text, files and
 * recordings, kept in the chat's private storage, with no answer window. The
 * visitor's chat window reads the answer from here.
 */
@Injectable()
export class SiteChatInboxAdapter
	implements IInboxChannelAdapter, OnModuleInit
{
	public readonly channel: InboxEnum.Channel = InboxEnum.Channel.SITE;

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
		private readonly _conversations: InboxConversationsService,
		private readonly _messages: InboxMessagesService,
		private readonly _media: StoreChatMediaService,
		private readonly _typing: SiteChatTypingState,
		private readonly _edition: StoreChatEditionService,
		private readonly _deletion: StoreChatDeletionService,
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
		return await this._record(ctx, conversation, text, []);
	}

	/** The visitor's window shows "writing…" while the store writes. */
	public async sendTyping(
		_ctx: IInboxReplyContext,
		conversation: IInboxConversation,
	): Promise<void> {
		this._typing.mark(String(conversation._id));
	}

	public async sendMedia(
		ctx: IInboxReplyContext,
		conversation: IInboxConversation,
		file: IInboxUploadFile,
		options: { caption: string | null; asVoice: boolean },
	): Promise<IInboxMessage> {
		const attachment: IInboxAttachment = await this._media.store(
			file,
			options.asVoice,
		);

		return await this._record(ctx, conversation, options.caption ?? null, [
			attachment,
		]);
	}

	/** Only what the store wrote: the visitor's messages are the visitor's. */
	public canDeleteMessage(message: IInboxMessage): boolean {
		return message.direction === InboxEnum.Direction.OUT;
	}

	/** Removed for the visitor too: there is one conversation. */
	public async deleteMessage(
		_ownerUserId: string,
		conversation: IInboxConversation,
		message: IInboxMessage,
	): Promise<void> {
		await this._deletion.remove(
			conversation,
			String(message._id),
			InboxEnum.Direction.OUT,
		);
	}

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
		return await this._edition.edit(
			conversation,
			String(message._id),
			InboxEnum.Direction.OUT,
			storeChatText(text),
		);
	}

	public async fetchAttachment(
		_ownerUserId: string,
		_conversation: IInboxConversation,
		message: IInboxMessage,
		index: number,
	): Promise<{ buffer: Buffer; contentType: string; fileName: string | null }> {
		return await this._media.read(message, index);
	}

	/** Records an answer where the visitor reads it, and moves the preview. */
	private async _record(
		ctx: IInboxReplyContext,
		conversation: IInboxConversation,
		text: string | null,
		attachments: IInboxAttachment[],
	): Promise<IInboxMessage> {
		const kind: InboxEnum.MessageKind =
			attachments[0]?.kind ?? InboxEnum.MessageKind.TEXT;

		// The answer is here: the store is no longer writing.
		this._typing.clear(String(conversation._id));

		const input: IInboxMessageInput = {
			channelMessageId: new mongoose.Types.ObjectId().toString(),
			kind,
			text,
			attachments,
			sentAt: new Date(),
			sentByEmployeeId: ctx.employeeId ?? null,
		};

		const saved: IInboxMessage = await this._messages.saveOutgoing(
			ctx.ownerUserId,
			conversation,
			input,
		);

		await this._conversations.applyOutgoing(
			ctx.ownerUserId,
			String(conversation._id),
			{
				text,
				kind,
				channelKind: null,
				direction: InboxEnum.Direction.OUT,
				at: input.sentAt,
			},
		);

		return saved;
	}
}
