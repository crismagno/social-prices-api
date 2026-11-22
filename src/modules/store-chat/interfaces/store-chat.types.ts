import { IInboxAttachmentView } from '../../inbox/interfaces/inbox-central.types';
import InboxEnum from '../../inbox/interfaces/inbox.enum';
import StoresEnum from '../../stores/interfaces/stores.enum';

/** Who is asking, as the token says. */
export interface IStoreChatBuyer {
	userId: string;
	email: string;
}

/** All a customer account gets to know about a store. Nothing else leaves the server. */
export interface IStoreChatStoreCard {
	_id: string;
	name: string;
	logo: string | null;
	description: string | null;
	type: StoresEnum.Type | null;
	/**
	 * The address of the store's site while it is online. Only told for the
	 * store being opened, not in lists.
	 */
	siteSlug?: string | null;
}

/** A conversation as the customer account lists it. */
export interface IStoreChatConversationView {
	store: IStoreChatStoreCard;
	lastMessageAt: Date;
	lastMessageText: string | null;
	/** What the last message is, for when it has no text (a photo, a recording). */
	lastMessageKind: InboxEnum.MessageKind | null;
	lastMessageFromMe: boolean;
	unreadCount: number;
}

/** A message as the customer account reads it: who answered at the store stays there. */
export interface IStoreChatMessageView {
	_id: string;
	fromMe: boolean;
	kind: InboxEnum.MessageKind;
	text: string | null;
	/** What each file is. Where it is kept stays on the server. */
	attachments: IInboxAttachmentView[];
	sentAt: Date;
	/** When its words were last changed after being sent; null when they never were. */
	editedAt: Date | null;
}

/** What starting a conversation from the store's side gives back, to open it in the inbox. */
export interface IStoreChatStarted {
	conversationId: string;
	customerId: string;
}
