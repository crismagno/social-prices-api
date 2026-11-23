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
import { StoreChatMediaService } from '../store-chat/store-chat-media.service';
import { STORE_CHAT_MAX_UPLOAD_BYTES } from '../store-chat/store-chat.constants';

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
		deleteMessage: false,
		editMessage: false,
		answerWindowMs: null,
	};

	constructor(
		private readonly _registry: InboxChannelRegistry,
		private readonly _conversations: InboxConversationsService,
		private readonly _messages: InboxMessagesService,
		private readonly _media: StoreChatMediaService,
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
