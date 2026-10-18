namespace TelegramEnum {
	/** IN: a customer wrote to the bot. OUT: someone answered from this system. */
	export enum Direction {
		IN = 'IN',
		OUT = 'OUT',
	}

	/** What a customer sent, as far as this app cares to tell apart. */
	export enum ContentType {
		TEXT = 'TEXT',
		PHOTO = 'PHOTO',
		DOCUMENT = 'DOCUMENT',
		VOICE = 'VOICE',
		AUDIO = 'AUDIO',
		VIDEO = 'VIDEO',
		VIDEO_NOTE = 'VIDEO_NOTE',
		STICKER = 'STICKER',
		LOCATION = 'LOCATION',
		CONTACT = 'CONTACT',
		OTHER = 'OTHER',
	}
}

export default TelegramEnum;
