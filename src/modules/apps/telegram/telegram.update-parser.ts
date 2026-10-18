import TelegramEnum from './telegram.enum';
import {
	INormalizedTelegramMessage,
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

	const contentType: TelegramEnum.ContentType =
		CONTENT_KEYS.find(
			([key]: [string, TelegramEnum.ContentType]) => key in message,
		)?.[1] ?? TelegramEnum.ContentType.OTHER;

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
		sentAt: new Date(message.date * 1000),
	};
};
