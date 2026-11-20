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
}

/** A conversation as the customer account lists it. */
export interface IStoreChatConversationView {
	store: IStoreChatStoreCard;
	lastMessageAt: Date;
	lastMessageText: string | null;
	lastMessageFromMe: boolean;
	unreadCount: number;
}

/** A message as the customer account reads it: who answered at the store stays there. */
export interface IStoreChatMessageView {
	_id: string;
	fromMe: boolean;
	text: string | null;
	sentAt: Date;
}

/** What starting a conversation from the store's side gives back, to open it in the inbox. */
export interface IStoreChatStarted {
	conversationId: string;
	customerId: string;
}
