namespace InboxEnum {
	/** Where a conversation happens. A new channel is a new value here and a new adapter. */
	export enum Channel {
		TELEGRAM = 'TELEGRAM',
		MESSENGER = 'MESSENGER',
		INSTAGRAM = 'INSTAGRAM',
		WHATSAPP = 'WHATSAPP',
		/** The platform's own chat between a customer account and a store. No app behind it. */
		STORE = 'STORE',
		/** A visitor of a store's site, without an account, through its chat window. */
		SITE = 'SITE',
	}

	/** IN: the person wrote. OUT: someone answered, from here or from the channel's own app. */
	export enum Direction {
		IN = 'IN',
		OUT = 'OUT',
	}

	/** What a message is, in one vocabulary for every channel. */
	export enum MessageKind {
		TEXT = 'TEXT',
		IMAGE = 'IMAGE',
		VIDEO = 'VIDEO',
		AUDIO = 'AUDIO',
		VOICE = 'VOICE',
		FILE = 'FILE',
		STICKER = 'STICKER',
		LOCATION = 'LOCATION',
		CONTACT = 'CONTACT',
		SHARE = 'SHARE',
		UNSUPPORTED = 'UNSUPPORTED',
		OTHER = 'OTHER',
	}

	/** How a file of a message can be fetched again. */
	export enum AttachmentSourceType {
		TELEGRAM_FILE = 'TELEGRAM_FILE',
		WHATSAPP_MEDIA = 'WHATSAPP_MEDIA',
		URL = 'URL',
		/** Kept by us, in the chat's own storage: the platform's store chat. */
		STORED_FILE = 'STORED_FILE',
	}
}

export default InboxEnum;
