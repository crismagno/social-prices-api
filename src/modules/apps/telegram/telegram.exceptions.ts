import {
	BadRequestException,
	ConflictException,
	NotFoundException,
} from '@nestjs/common';

export const TELEGRAM_NOT_CONNECTED_CODE: string = 'TELEGRAM_NOT_CONNECTED';
export const TELEGRAM_INVALID_TOKEN_CODE: string = 'TELEGRAM_INVALID_TOKEN';
export const TELEGRAM_BOT_ALREADY_CONNECTED_CODE: string =
	'TELEGRAM_BOT_ALREADY_CONNECTED';
export const TELEGRAM_WEBHOOK_URL_MISSING_CODE: string =
	'TELEGRAM_WEBHOOK_URL_MISSING';
export const TELEGRAM_WEBHOOK_REJECTED_CODE: string =
	'TELEGRAM_WEBHOOK_REJECTED';

export class TelegramNotConnectedException extends ConflictException {
	constructor() {
		super({
			code: TELEGRAM_NOT_CONNECTED_CODE,
			message: 'No Telegram bot is connected.',
		});
	}
}

export class TelegramInvalidTokenException extends BadRequestException {
	constructor() {
		super({
			code: TELEGRAM_INVALID_TOKEN_CODE,
			message:
				'Telegram did not accept this bot token. Copy it again from @BotFather.',
		});
	}
}

export class TelegramBotAlreadyConnectedException extends ConflictException {
	constructor() {
		super({
			code: TELEGRAM_BOT_ALREADY_CONNECTED_CODE,
			message: 'This bot is already connected to another account.',
		});
	}
}

export class TelegramWebhookUrlMissingException extends ConflictException {
	constructor() {
		super({
			code: TELEGRAM_WEBHOOK_URL_MISSING_CODE,
			message:
				'TELEGRAM_WEBHOOK_BASE_URL is not set to a public https address, so Telegram has nowhere to send messages.',
		});
	}
}

export class TelegramWebhookRejectedException extends ConflictException {
	constructor(reason: string) {
		super({
			code: TELEGRAM_WEBHOOK_REJECTED_CODE,
			message: `Telegram did not accept the webhook: ${reason}`,
			reason,
		});
	}
}

export const TELEGRAM_CHAT_NOT_FOUND_CODE: string = 'TELEGRAM_CHAT_NOT_FOUND';
export const TELEGRAM_CHAT_UNAVAILABLE_CODE: string =
	'TELEGRAM_CHAT_UNAVAILABLE';
export const TELEGRAM_CHAT_ALREADY_LINKED_CODE: string =
	'TELEGRAM_CHAT_ALREADY_LINKED';
export const TELEGRAM_CUSTOMER_NOT_FOUND_CODE: string =
	'TELEGRAM_CUSTOMER_NOT_FOUND';
export const TELEGRAM_CUSTOMER_ALREADY_LINKED_CODE: string =
	'TELEGRAM_CUSTOMER_ALREADY_LINKED';

export class TelegramChatNotFoundException extends NotFoundException {
	constructor() {
		super({
			code: TELEGRAM_CHAT_NOT_FOUND_CODE,
			message: 'This conversation does not exist.',
		});
	}
}

/** The person blocked the bot, or Telegram cannot deliver to that chat any more. */
export class TelegramChatUnavailableException extends ConflictException {
	constructor(reason: string) {
		super({
			code: TELEGRAM_CHAT_UNAVAILABLE_CODE,
			message: `Telegram could not deliver the message: ${reason}`,
			reason,
		});
	}
}

export class TelegramChatAlreadyLinkedException extends ConflictException {
	constructor() {
		super({
			code: TELEGRAM_CHAT_ALREADY_LINKED_CODE,
			message: 'This conversation is already linked to a customer.',
		});
	}
}

export class TelegramCustomerNotFoundException extends NotFoundException {
	constructor() {
		super({
			code: TELEGRAM_CUSTOMER_NOT_FOUND_CODE,
			message: 'This customer does not exist.',
		});
	}
}

export class TelegramCustomerAlreadyLinkedException extends ConflictException {
	constructor() {
		super({
			code: TELEGRAM_CUSTOMER_ALREADY_LINKED_CODE,
			message:
				'This customer is already linked to a Telegram contact, or this Telegram contact already belongs to another customer.',
		});
	}
}
