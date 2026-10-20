import mongoose from 'mongoose';

import InboxEnum from './inbox.enum';

/** What the channel says about the person. `extra` holds what only that channel has. */
export interface IInboxContact {
	name: string | null;
	username: string | null;
	profilePic: string | null;
	languageCode: string | null;
	extra: Record<string, unknown>;
}

/** Where to get a file again: Telegram by file id, the others by a temporary address. */
export type IInboxAttachmentSource =
	| { type: InboxEnum.AttachmentSourceType.TELEGRAM_FILE; fileId: string }
	| { type: InboxEnum.AttachmentSourceType.URL; url: string };

export interface IInboxAttachment {
	kind: InboxEnum.MessageKind;
	mimeType: string | null;
	fileName: string | null;
	size: number | null;
	width: number | null;
	height: number | null;
	duration: number | null;
	source: IInboxAttachmentSource;
}

/** Who a conversation is: a person on a channel, for one user. */
export interface IConversationKey {
	channel: InboxEnum.Channel;
	/** The channel's id for the person, as a string. */
	contactKey: string;
}

/** What the inbox list shows of a conversation's last message. */
export interface IInboxPreview {
	text: string | null;
	kind: InboxEnum.MessageKind;
	/** The channel's own name for the kind, when the app needs it back as it was. */
	channelKind: string | null;
	direction: InboxEnum.Direction;
	at: Date;
}

export interface IInboxConversation {
	readonly _id: string;
	ownerUserId: mongoose.Schema.Types.ObjectId;
	channel: InboxEnum.Channel;
	contactKey: string;
	/** The connected bot, page or account the conversation came through. */
	accountKey: string | null;
	contact: IInboxContact;
	customerId: mongoose.Schema.Types.ObjectId | null;
	customerChangedAt: Date | null;
	/** Null until the first message. */
	lastMessageAt: Date | null;
	lastMessageText: string | null;
	lastMessageKind: InboxEnum.MessageKind | null;
	lastMessageChannelKind: string | null;
	lastMessageDirection: InboxEnum.Direction | null;
	/** When the person last wrote: the base of the answer window. Epoch when they never did. */
	lastIncomingAt: Date;
	unreadCount: number;
	createdAt: Date;
	updatedAt: Date;
}

export interface IInboxSender {
	id: string | null;
	name: string | null;
	username: string | null;
}

/** What a channel hands over for one message; the rest is filled in by the core. */
export interface IInboxMessageInput {
	channelMessageId: string;
	kind: InboxEnum.MessageKind;
	text: string | null;
	attachments: IInboxAttachment[];
	sentAt: Date;
	sender?: IInboxSender | null;
	sentByEmployeeId?: string | null;
	isUnsupported?: boolean;
	/** Whatever else only that channel knows (a Telegram update id, the content type it used...). */
	channelData?: Record<string, unknown> | null;
	/** The event exactly as the channel delivered it. Never a token. */
	raw?: unknown;
}

export interface IInboxMessage {
	readonly _id: string;
	ownerUserId: mongoose.Schema.Types.ObjectId;
	conversationId: mongoose.Schema.Types.ObjectId;
	channel: InboxEnum.Channel;
	channelMessageId: string;
	direction: InboxEnum.Direction;
	kind: InboxEnum.MessageKind;
	text: string | null;
	attachments: IInboxAttachment[];
	sender: IInboxSender | null;
	sentAt: Date;
	receivedAt: Date;
	sentByEmployeeId: string | null;
	status: { deliveredAt: Date | null; readAt: Date | null };
	isEcho: boolean;
	isUnsupported: boolean;
	deletedAt: Date | null;
	channelData: Record<string, unknown> | null;
	raw: unknown;
	createdAt: Date;
}
