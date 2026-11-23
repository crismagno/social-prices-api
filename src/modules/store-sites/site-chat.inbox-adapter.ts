import mongoose from 'mongoose';

import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';

import {
	IInboxChannelAdapter,
	IInboxChannelCapabilities,
	IInboxReplyContext,
} from '../inbox/inbox-channel.adapter';
import { InboxChannelRegistry } from '../inbox/inbox-channel.registry';
import { InboxConversationsService } from '../inbox/inbox-conversations.service';
import { InboxMessagesService } from '../inbox/inbox-messages.service';
import InboxEnum from '../inbox/interfaces/inbox.enum';
import {
	IInboxConversation,
	IInboxMessage,
	IInboxMessageInput,
} from '../inbox/interfaces/inbox.types';

/**
 * How the central inbox answers a visitor of a store's site. Text only, with
 * no answer window: the visitor's chat window reads the answer from here.
 */
@Injectable()
export class SiteChatInboxAdapter
	implements IInboxChannelAdapter, OnModuleInit
{
	public readonly channel: InboxEnum.Channel = InboxEnum.Channel.SITE;

	public readonly capabilities: IInboxChannelCapabilities = {
		text: true,
		media: false,
		voice: false,
		maxUploadBytes: null,
		deleteMessage: false,
		editMessage: false,
		answerWindowMs: null,
	};

	constructor(
		private readonly _registry: InboxChannelRegistry,
		private readonly _conversations: InboxConversationsService,
		private readonly _messages: InboxMessagesService,
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
		const input: IInboxMessageInput = {
			channelMessageId: new mongoose.Types.ObjectId().toString(),
			kind: InboxEnum.MessageKind.TEXT,
			text,
			attachments: [],
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
				kind: InboxEnum.MessageKind.TEXT,
				channelKind: null,
				direction: InboxEnum.Direction.OUT,
				at: input.sentAt,
			},
		);

		return saved;
	}

	/** The visitor sends text only: there is never a file to fetch. */
	public async fetchAttachment(): Promise<{
		buffer: Buffer;
		contentType: string;
		fileName: string | null;
	}> {
		throw new NotFoundException('There are no files in a site chat.');
	}
}
