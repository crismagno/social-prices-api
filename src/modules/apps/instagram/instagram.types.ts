import InstagramEnum from './instagram.enum';

/** The professional Instagram account the user connected. */
export interface IInstagramAccount {
	/** The account's id in webhooks and in the messaging API. */
	userId: string;
	username: string;
	name: string | null;
	profilePictureUrl: string | null;
	/** BUSINESS or MEDIA_CREATOR: the only kinds that can use messaging. */
	accountType: string;
}

/** A token that speaks for the account, and when it stops working. */
export interface IInstagramToken {
	accessToken: string;
	expiresAt: Date;
}

/** Instagram refused a call, or could not be reached (status 0). Never carries a token. */
export class InstagramApiError extends Error {
	constructor(
		public readonly status: number,
		public readonly code: number | null,
		public readonly description: string,
	) {
		super(`Instagram API error ${status}: ${description}`);
		this.name = 'InstagramApiError';
	}
}

/** One file of a message. The address is temporary: Instagram's CDN expires it. */
export interface IInstagramAttachment {
	type: string;
	url: string;
}

/**
 * A message of a conversation, ready to store: what a customer wrote (IN), or what
 * the account sent from outside this system (OUT, an "echo").
 */
export interface INormalizedInstagramMessage {
	/** The account that owns the conversation. */
	accountId: string;
	/** The customer, as Instagram knows them for this account. */
	igsid: string;
	direction: InstagramEnum.Direction;
	mid: string;
	text: string | null;
	attachments: IInstagramAttachment[];
	/** Instagram could not carry this kind of message (a like, a share...). */
	isUnsupported: boolean;
	sentAt: Date;
	/** The event exactly as Instagram delivered it. */
	raw?: unknown;
}

export interface IInstagramProfile {
	name: string | null;
	username: string | null;
	profilePic: string | null;
}
