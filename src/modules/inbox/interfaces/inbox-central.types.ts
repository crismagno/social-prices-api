import InboxEnum from './inbox.enum';

/** One person on one channel, as the central page lists them. */
export interface IInboxConversationView {
	_id: string;
	channel: InboxEnum.Channel;
	contactKey: string;
	name: string | null;
	username: string | null;
	profilePic: string | null;
	unreadCount: number;
	lastMessageAt: Date | null;
	/** Whether an answer is allowed now on this channel, and until when. */
	canReply: boolean;
	replyWindowEndsAt: Date | null;
}

/**
 * A row of the central list: a customer with all their conversations, or, when
 * nobody is tied to it yet, one conversation alone.
 */
export interface IInboxChatView {
	/** Stable key of the row: the customer's id, or `conversation:<id>`. */
	key: string;
	customerId: string | null;
	/** The customer's name, or what the channel says about an unassigned person. */
	name: string | null;
	avatar: string | null;
	channels: InboxEnum.Channel[];
	conversations: IInboxConversationView[];
	/** Where an answer goes by default: the conversation of the last message received. */
	replyConversationId: string;
	lastMessageAt: Date | null;
	lastMessageText: string | null;
	lastMessageKind: InboxEnum.MessageKind | null;
	lastMessageChannel: InboxEnum.Channel | null;
	lastMessageDirection: InboxEnum.Direction | null;
	unreadCount: number;
}

export interface IInboxAttachmentView {
	index: number;
	kind: InboxEnum.MessageKind;
	mimeType: string | null;
	fileName: string | null;
	size: number | null;
	width: number | null;
	height: number | null;
	duration: number | null;
}

/** A message of the timeline; the raw event and the files' addresses stay on the server. */
export interface IInboxMessageView {
	_id: string;
	conversationId: string;
	channel: InboxEnum.Channel;
	direction: InboxEnum.Direction;
	kind: InboxEnum.MessageKind;
	text: string | null;
	attachments: IInboxAttachmentView[];
	isUnsupported: boolean;
	sentAt: Date;
	sentByEmployeeId: string | null;
	/** Whether the message's channel lets it be removed. */
	canDelete: boolean;
}

/** Which conversations a call is about: all of a customer's, or just one. */
export interface IInboxScope {
	customerId?: string;
	conversationId?: string;
}
