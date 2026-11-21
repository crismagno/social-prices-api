import InboxEnum from './interfaces/inbox.enum';
import { IInboxConversation, IInboxMessage } from './interfaces/inbox.types';

export interface IInboxReplyContext {
	ownerUserId: string;
	employeeId: string | null;
}

/** A file to send, as it came from the browser. */
export interface IInboxUploadFile {
	buffer: Buffer;
	fileName: string;
	mimeType: string;
}

/** What a channel can do, so the central page offers only that. */
export interface IInboxChannelCapabilities {
	text: boolean;
	media: boolean;
	voice: boolean;
	/** Largest file the channel takes, in bytes; null when it takes none. */
	maxUploadBytes: number | null;
	/** Whether a message can be removed from the inbox through this channel. */
	deleteMessage: boolean;
	/** Whether the words of a message already sent can be changed through this channel. */
	editMessage: boolean;
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

	/**
	 * Lets the person see "typing…" while the user writes. Best effort and
	 * silent: it never throws.
	 */
	sendTyping?(
		ctx: IInboxReplyContext,
		conversation: IInboxConversation,
	): Promise<void>;

	/**
	 * Sends a file (or a recording, with `asVoice`) and records it. The text, when
	 * there is one, goes as its caption, or as a message of its own where the
	 * channel has no captions. Present when `capabilities.media` is true.
	 */
	sendMedia?(
		ctx: IInboxReplyContext,
		conversation: IInboxConversation,
		file: IInboxUploadFile,
		options: { caption: string | null; asVoice: boolean },
	): Promise<IInboxMessage>;

	/**
	 * Whether this one message can be removed, where the channel does not let
	 * every message go. Absent means "any message", as `capabilities` says.
	 */
	canDeleteMessage?(message: IInboxMessage): boolean;

	/**
	 * Removes a message. Each channel decides what that means: Telegram deletes it
	 * for the customer too, the others only take it out of the inbox. Present when
	 * `capabilities.deleteMessage` is true.
	 */
	deleteMessage?(
		ownerUserId: string,
		conversation: IInboxConversation,
		message: IInboxMessage,
	): Promise<void>;

	/**
	 * Whether the words of this one message can be changed, where the channel
	 * does not allow it for every message. Absent means "any message", as
	 * `capabilities` says.
	 */
	canEditMessage?(message: IInboxMessage): boolean;

	/**
	 * Changes the words of a message already sent (its text, or the caption of
	 * its file), for the person on the other side too, and gives it back as it
	 * is now. The channel's own rules and limits apply. Present when
	 * `capabilities.editMessage` is true.
	 */
	editMessage?(
		ownerUserId: string,
		conversation: IInboxConversation,
		message: IInboxMessage,
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
