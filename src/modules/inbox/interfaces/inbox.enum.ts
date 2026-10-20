namespace InboxEnum {
	/** Where a conversation happens. A new channel is a new value here and a new adapter. */
	export enum Channel {
		TELEGRAM = 'TELEGRAM',
		MESSENGER = 'MESSENGER',
		INSTAGRAM = 'INSTAGRAM',
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
		URL = 'URL',
	}
}

export default InboxEnum;
