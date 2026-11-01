import { ConflictException, NotFoundException } from '@nestjs/common';

export const WHATSAPP_NOT_CONFIGURED_CODE: string = 'WHATSAPP_NOT_CONFIGURED';
export const WHATSAPP_NOT_CONNECTED_CODE: string = 'WHATSAPP_NOT_CONNECTED';
export const WHATSAPP_NUMBER_ALREADY_CONNECTED_CODE: string =
	'WHATSAPP_NUMBER_ALREADY_CONNECTED';
export const WHATSAPP_CONNECT_FAILED_CODE: string = 'WHATSAPP_CONNECT_FAILED';
export const WHATSAPP_SUBSCRIBE_FAILED_CODE: string =
	'WHATSAPP_SUBSCRIBE_FAILED';
export const WHATSAPP_CHAT_NOT_FOUND_CODE: string = 'WHATSAPP_CHAT_NOT_FOUND';
export const WHATSAPP_REPLY_WINDOW_CLOSED_CODE: string =
	'WHATSAPP_REPLY_WINDOW_CLOSED';
export const WHATSAPP_CHAT_UNAVAILABLE_CODE: string =
	'WHATSAPP_CHAT_UNAVAILABLE';
export const WHATSAPP_CONNECTION_REVOKED_CODE: string =
	'WHATSAPP_CONNECTION_REVOKED';
export const WHATSAPP_ATTACHMENT_NOT_FOUND_CODE: string =
	'WHATSAPP_ATTACHMENT_NOT_FOUND';

export class WhatsappNotConfiguredException extends ConflictException {
	constructor() {
		super({
			code: WHATSAPP_NOT_CONFIGURED_CODE,
			message: 'WhatsApp is not set up on this server yet.',
		});
	}
}

export class WhatsappNotConnectedException extends ConflictException {
	constructor() {
		super({
			code: WHATSAPP_NOT_CONNECTED_CODE,
			message: 'No WhatsApp number is connected.',
		});
	}
}

export class WhatsappNumberAlreadyConnectedException extends ConflictException {
	constructor() {
		super({
			code: WHATSAPP_NUMBER_ALREADY_CONNECTED_CODE,
			message: 'This WhatsApp number is already connected to another user.',
		});
	}
}

export class WhatsappConnectFailedException extends ConflictException {
	constructor(reason: string) {
		super({
			code: WHATSAPP_CONNECT_FAILED_CODE,
			message: `WhatsApp did not accept the connection: ${reason}`,
			reason,
		});
	}
}

export class WhatsappSubscribeFailedException extends ConflictException {
	constructor(reason: string) {
		super({
			code: WHATSAPP_SUBSCRIBE_FAILED_CODE,
			message: `WhatsApp did not let this app receive the messages of the number: ${reason}`,
			reason,
		});
	}
}

export class WhatsappChatNotFoundException extends NotFoundException {
	constructor() {
		super({
			code: WHATSAPP_CHAT_NOT_FOUND_CODE,
			message: 'This conversation does not exist.',
		});
	}
}

export class WhatsappReplyWindowClosedException extends ConflictException {
	constructor() {
		super({
			code: WHATSAPP_REPLY_WINDOW_CLOSED_CODE,
			message:
				'WhatsApp only allows answering for 24 hours after the person last wrote.',
		});
	}
}

export class WhatsappChatUnavailableException extends ConflictException {
	constructor(reason: string) {
		super({
			code: WHATSAPP_CHAT_UNAVAILABLE_CODE,
			message: `WhatsApp could not deliver the message: ${reason}`,
			reason,
		});
	}
}

export class WhatsappConnectionRevokedException extends ConflictException {
	constructor() {
		super({
			code: WHATSAPP_CONNECTION_REVOKED_CODE,
			message:
				'WhatsApp no longer accepts the connection of this number. Connect again.',
		});
	}
}

export class WhatsappAttachmentNotFoundException extends NotFoundException {
	constructor() {
		super({
			code: WHATSAPP_ATTACHMENT_NOT_FOUND_CODE,
			message: 'This message has no such file.',
		});
	}
}
