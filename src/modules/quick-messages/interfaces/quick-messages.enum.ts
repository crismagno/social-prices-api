namespace QuickMessagesEnum {
	/** A block of a quick message: some text, or one file. */
	export enum BlockType {
		TEXT = 'TEXT',
		MEDIA = 'MEDIA',
	}

	/** What a file block is, taken from its mimetype. */
	export enum MediaKind {
		IMAGE = 'IMAGE',
		VIDEO = 'VIDEO',
		AUDIO = 'AUDIO',
		FILE = 'FILE',
	}

	export enum ErrorCode {
		NAME_TAKEN = 'QUICK_MESSAGE_NAME_TAKEN',
		NOT_ALLOWED = 'QUICK_MESSAGE_NOT_ALLOWED',
		FILE_MISSING = 'QUICK_MESSAGE_FILE_MISSING',
		PARTIAL_SEND = 'QUICK_MESSAGE_PARTIAL_SEND',
	}

	export const MAX_BLOCKS: number = 20;

	export const MAX_TEXT_LENGTH: number = 1000;

	export const MAX_NAME_LENGTH: number = 80;
}

export default QuickMessagesEnum;
