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

/** A customer's message, ready to store. */
export interface INormalizedMessengerMessage {
	pageId: string;
	/** The customer, as Facebook knows them for this Page. */
	psid: string;
	mid: string;
	text: string | null;
	attachments: IMessengerAttachment[];
	sentAt: Date;
}

export interface IMetaProfile {
	name: string | null;
	profilePic: string | null;
}
