import TelegramEnum from './telegram.enum';
import {
	INormalizedTelegramMessage,
	ITelegramMedia,
	ITelegramMessage,
	ITelegramUpdate,
} from './telegram.types';

// The first key found says what kind of content it is. Order only matters if a
// message ever carried two of them, which Telegram does not do.
const CONTENT_KEYS: [string, TelegramEnum.ContentType][] = [
	['text', TelegramEnum.ContentType.TEXT],
	['photo', TelegramEnum.ContentType.PHOTO],
	['document', TelegramEnum.ContentType.DOCUMENT],
	['voice', TelegramEnum.ContentType.VOICE],
	['audio', TelegramEnum.ContentType.AUDIO],
	['video_note', TelegramEnum.ContentType.VIDEO_NOTE],
	['video', TelegramEnum.ContentType.VIDEO],
	['sticker', TelegramEnum.ContentType.STICKER],
	['location', TelegramEnum.ContentType.LOCATION],
	['contact', TelegramEnum.ContentType.CONTACT],
];

const isObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

export const contentTypeOf = (
	message: ITelegramMessage,
): TelegramEnum.ContentType =>
	CONTENT_KEYS.find(
		([key]: [string, TelegramEnum.ContentType]) => key in message,
	)?.[1] ?? TelegramEnum.ContentType.OTHER;

const asNumber = (value: unknown): number | null =>
	typeof value === 'number' ? value : null;

const asString = (value: unknown): string | null =>
	typeof value === 'string' ? value : null;

const STICKER_MIME = (sticker: Record<string, unknown>): string =>
	sticker.is_animated
		? 'application/x-tgsticker'
		: sticker.is_video
		? 'video/webm'
		: 'image/webp';

/**
 * The file of a message, if it has one. Photos come in several sizes; the last
 * one is the biggest. Locations and contacts carry no file.
 */
export const extractTelegramMedia = (
	message: ITelegramMessage,
): ITelegramMedia | undefined => {
	const type: TelegramEnum.ContentType = contentTypeOf(message);

	let raw: unknown;
	let mimeType: string | null = null;

	switch (type) {
		case TelegramEnum.ContentType.PHOTO: {
			const sizes: unknown = message.photo;
			raw = Array.isArray(sizes) ? sizes[sizes.length - 1] : undefined;
			mimeType = 'image/jpeg';
			break;
		}
		case TelegramEnum.ContentType.DOCUMENT:
			raw = message.document;
			break;
		case TelegramEnum.ContentType.VOICE:
			raw = message.voice;
			mimeType = 'audio/ogg';
			break;
		case TelegramEnum.ContentType.AUDIO:
			raw = message.audio;
			break;
		case TelegramEnum.ContentType.VIDEO:
			raw = message.video;
			mimeType = 'video/mp4';
			break;
		case TelegramEnum.ContentType.VIDEO_NOTE:
			raw = message.video_note;
			mimeType = 'video/mp4';
			break;
		case TelegramEnum.ContentType.STICKER:
			raw = message.sticker;
			mimeType = isObject(raw) ? STICKER_MIME(raw) : null;
			break;
		default:
			return undefined;
	}

	if (!isObject(raw) || typeof raw.file_id !== 'string') {
		return undefined;
	}

	return {
		fileId: raw.file_id,
		fileName: asString(raw.file_name),
		mimeType: asString(raw.mime_type) ?? mimeType,
		size: asNumber(raw.file_size),
		width: asNumber(raw.width),
		height: asNumber(raw.height),
		duration: asNumber(raw.duration),
	};
};

/**
 * Reads what a customer wrote to the bot. Only direct messages count: edits,
 * button presses, group traffic and the like return null and are dropped.
 * Never throws, whatever the body looks like.
 */
export const parseTelegramUpdate = (
	update: ITelegramUpdate,
): INormalizedTelegramMessage | null => {
	if (!isObject(update) || typeof update.update_id !== 'number') {
		return null;
	}

	const message: ITelegramMessage | undefined = update.message;

	if (
		!isObject(message) ||
		message.chat?.type !== 'private' ||
		typeof message.from?.id !== 'number'
	) {
		return null;
	}

	const contentType: TelegramEnum.ContentType = contentTypeOf(message);

	const media: ITelegramMedia | undefined = extractTelegramMedia(message);

	const text: unknown =
		contentType === TelegramEnum.ContentType.TEXT
			? message.text
			: message.caption;

	return {
		updateId: update.update_id,
		messageId: message.message_id,
		chatId: message.chat.id,
		fromUserId: message.from.id,
		fromFirstName: message.from.first_name ?? null,
		fromLastName: message.from.last_name ?? null,
		fromUsername: message.from.username ?? null,
		fromLanguageCode: message.from.language_code ?? null,
		contentType,
		text: typeof text === 'string' ? text : null,
		...(media ? { media } : {}),
		sentAt: new Date(message.date * 1000),
	};
};
