/** Meta refused a call, or could not be reached (status 0). Never carries a token. */
export class WhatsappApiError extends Error {
	constructor(
		public readonly status: number,
		public readonly code: number | null,
		public readonly description: string,
	) {
		super(`WhatsApp API error ${status}: ${description}`);
		this.name = 'WhatsappApiError';
	}
}

/** What Meta tells about the business number a user connected. */
export interface IWhatsappNumber {
	displayPhoneNumber: string;
	verifiedName: string | null;
}

/** The file a message carries. Its bytes are fetched later, by `id`, with the user's token. */
export interface IWhatsappMedia {
	id: string;
	mimeType: string | null;
	fileName: string | null;
	/** An audio recorded in WhatsApp itself (a voice note). */
	isVoice: boolean;
}

/** A message a customer sent, ready to store. */
export interface INormalizedWhatsappMessage {
	/** The business number that received it: how the owner is found. */
	phoneNumberId: string;
	/** The customer, by phone number (digits only). */
	waId: string;
	profileName: string | null;
	/** WhatsApp's id of the message (`wamid...`). */
	mid: string;
	/** WhatsApp's own name for what it is: text, image, audio, video, document, sticker, location... */
	type: string;
	/** The text, or the caption of a file, or what a location / contact / button says. */
	text: string | null;
	media: IWhatsappMedia | null;
	/** Something WhatsApp delivered that this system cannot show. */
	isUnsupported: boolean;
	sentAt: Date;
	/** The message exactly as delivered, with the number and contact it came with. */
	raw: unknown;
}

export interface IWhatsappUploadFile {
	buffer: Buffer;
	fileName: string;
	mimeType: string;
}

/** What the web needs to open Meta's Embedded Signup. None of it is secret. */
export interface IWhatsappConnectConfig {
	appId: string;
	configId: string;
	graphVersion: string;
}
