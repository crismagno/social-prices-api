import MessengerEnum from './messenger.enum';

/** A Facebook Page the user manages, with the token that speaks for it. */
export interface IMetaPage {
	id: string;
	name: string;
	accessToken: string;
}

/** Meta refused a call, or could not be reached (status 0). Never carries a token. */
export class MetaApiError extends Error {
	constructor(
		public readonly status: number,
		public readonly code: number | null,
		public readonly description: string,
	) {
		super(`Meta API error ${status}: ${description}`);
		this.name = 'MetaApiError';
	}
}

/** One file of a message. The address is temporary: Facebook's CDN expires it. */
export interface IMessengerAttachment {
	type: string;
	url: string;
}

/**
 * A message of a conversation, ready to store: what a customer wrote (IN), or what
 * the Page sent from outside this system (OUT, an "echo").
 */
export interface INormalizedMessengerMessage {
	pageId: string;
	/** The customer, as Facebook knows them for this Page. */
	psid: string;
	direction: MessengerEnum.Direction;
	mid: string;
	text: string | null;
	attachments: IMessengerAttachment[];
	sentAt: Date;
}

export interface IMessengerUploadFile {
	buffer: Buffer;
	fileName: string;
	mimeType: string;
}

/** What is known of a file this system sent, until Facebook's echo brings its address. */
export interface IMessengerLocalAttachment {
	type: string;
	fileName: string;
	size: number;
}

export interface IMetaProfile {
	name: string | null;
	profilePic: string | null;
}
