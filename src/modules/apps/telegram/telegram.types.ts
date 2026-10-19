import TelegramEnum from './telegram.enum';

/** The few fields of a Telegram update this app reads; everything else is ignored. */
export interface ITelegramUser {
	id: number;
	is_bot?: boolean;
	first_name?: string;
	last_name?: string;
	username?: string;
	language_code?: string;
}

export interface ITelegramMessage {
	message_id: number;
	date: number;
	chat: { id: number; type: string };
	from?: ITelegramUser;
	text?: string;
	caption?: string;
	[contentKey: string]: unknown;
}

export interface ITelegramUpdate {
	update_id: number;
	message?: ITelegramMessage;
	[otherUpdateType: string]: unknown;
}

/** The file behind a photo, document, voice note, etc. The bytes stay at Telegram. */
export interface ITelegramMedia {
	fileId: string;
	fileName: string | null;
	mimeType: string | null;
	size: number | null;
	width: number | null;
	height: number | null;
	duration: number | null;
}

/** A customer's message, ready to store. */
export interface INormalizedTelegramMessage {
	updateId: number;
	messageId: number;
	chatId: number;
	fromUserId: number;
	fromFirstName: string | null;
	fromLastName: string | null;
	fromUsername: string | null;
	fromLanguageCode: string | null;
	contentType: TelegramEnum.ContentType;
	text: string | null;
	media?: ITelegramMedia;
	sentAt: Date;
}

/** What Telegram answers after a message or a file was sent. */
export interface ITelegramSentMessage {
	messageId: number;
	sentAt: Date;
	contentType: TelegramEnum.ContentType;
	media?: ITelegramMedia;
}

export interface ITelegramUploadFile {
	buffer: Buffer;
	fileName: string;
	mimeType: string;
}

export interface ITelegramDownloadedFile {
	buffer: Buffer;
	filePath: string;
}

export interface ITelegramBotInfo {
	id: number;
	username: string;
	firstName: string;
}

export interface ITelegramWebhookInfo {
	url: string;
	pendingUpdateCount: number;
	lastErrorMessage: string | null;
	lastErrorDate: Date | null;
	lastSynchronizationErrorDate: Date | null;
	hasCustomCertificate: boolean;
	ipAddress: string | null;
	maxConnections: number | null;
	allowedUpdates: string[];
}

/** What the bot token's owner sees about the connection. Never the token. */
export interface ITelegramConnectionView {
	connected: boolean;
	botUsername: string | null;
	botName: string | null;
	connectedAt: Date | null;
	lastUpdateAt: Date | null;
}

export class TelegramApiError extends Error {
	constructor(
		public readonly status: number,
		public readonly description: string,
	) {
		// The request URL carries the bot token, so it is never part of the message.
		super(`Telegram API error ${status}: ${description}`);
	}
}

/** One row of the inbox. */
export interface ITelegramChatView {
	chatId: number;
	telegramUserId: number;
	firstName: string | null;
	lastName: string | null;
	username: string | null;
	customerId: string | null;
	customerName: string | null;
	lastMessageAt: Date;
	lastMessageText: string | null;
	lastMessageDirection: TelegramEnum.Direction;
	lastContentType: TelegramEnum.ContentType;
	unreadCount: number;
}
