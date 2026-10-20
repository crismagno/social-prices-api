import InboxEnum from './interfaces/inbox.enum';
import { IInboxConversation, IInboxMessage } from './interfaces/inbox.types';

export interface IInboxReplyContext {
	ownerUserId: string;
	employeeId: string | null;
}

/** What a channel can do, so the central page offers only that. */
export interface IInboxChannelCapabilities {
	text: boolean;
	media: boolean;
	voice: boolean;
	/** How long after the person's last message an answer is still allowed; null when no limit. */
	answerWindowMs: number | null;
}

/**
 * The few things the core needs from a channel. Receiving is the channel's own
 * business (its webhook calls the core); this is the way back out. A new channel
 * is a new adapter, registered when its module starts.
 */
export interface IInboxChannelAdapter {
	readonly channel: InboxEnum.Channel;
	readonly capabilities: IInboxChannelCapabilities;

	/** Whether an answer is allowed now, and until when. */
	canReply(conversation: IInboxConversation): {
		allowed: boolean;
		windowEndsAt: Date | null;
	};

	/** Sends the text through the channel and records it; the channel's own rules apply. */
	sendText(
		ctx: IInboxReplyContext,
		conversation: IInboxConversation,
		text: string,
	): Promise<IInboxMessage>;

	/** The bytes of one file of a message, fetched from the channel when asked for. */
	fetchAttachment(
		ownerUserId: string,
		conversation: IInboxConversation,
		message: IInboxMessage,
		index: number,
	): Promise<{ buffer: Buffer; contentType: string; fileName: string | null }>;
}
