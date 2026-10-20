import { ConflictException, NotFoundException } from '@nestjs/common';

export const MESSENGER_MESSAGE_NOT_FOUND_CODE: string =
	'MESSENGER_MESSAGE_NOT_FOUND';
export const MESSENGER_NOT_CONNECTED_CODE: string = 'MESSENGER_NOT_CONNECTED';
export const MESSENGER_PAGE_ALREADY_CONNECTED_CODE: string =
	'MESSENGER_PAGE_ALREADY_CONNECTED';
export const MESSENGER_PAGE_NOT_AVAILABLE_CODE: string =
	'MESSENGER_PAGE_NOT_AVAILABLE';
export const MESSENGER_PAGE_SUBSCRIBE_FAILED_CODE: string =
	'MESSENGER_PAGE_SUBSCRIBE_FAILED';

export class MessengerNotConnectedException extends ConflictException {
	constructor() {
		super({
			code: MESSENGER_NOT_CONNECTED_CODE,
			message: 'No Facebook Page is connected.',
		});
	}
}

export class MessengerPageAlreadyConnectedException extends ConflictException {
	constructor() {
		super({
			code: MESSENGER_PAGE_ALREADY_CONNECTED_CODE,
			message: 'This Page is already connected to another account.',
		});
	}
}

/** The page chosen is not on the list the login brought, or that list timed out. */
export class MessengerPageNotAvailableException extends ConflictException {
	constructor() {
		super({
			code: MESSENGER_PAGE_NOT_AVAILABLE_CODE,
			message: 'This Page is not available. Connect with Facebook again.',
		});
	}
}

export class MessengerPageSubscribeFailedException extends ConflictException {
	constructor(reason: string) {
		super({
			code: MESSENGER_PAGE_SUBSCRIBE_FAILED_CODE,
			message: `Facebook did not let this app receive the messages of the Page: ${reason}`,
			reason,
		});
	}
}

export const MESSENGER_CHAT_NOT_FOUND_CODE: string = 'MESSENGER_CHAT_NOT_FOUND';
export const MESSENGER_REPLY_WINDOW_CLOSED_CODE: string =
	'MESSENGER_REPLY_WINDOW_CLOSED';
export const MESSENGER_CHAT_UNAVAILABLE_CODE: string =
	'MESSENGER_CHAT_UNAVAILABLE';
export const MESSENGER_CUSTOMER_NOT_FOUND_CODE: string =
	'MESSENGER_CUSTOMER_NOT_FOUND';
export const MESSENGER_CUSTOMER_ALREADY_LINKED_CODE: string =
	'MESSENGER_CUSTOMER_ALREADY_LINKED';
export const MESSENGER_ATTACHMENT_NOT_FOUND_CODE: string =
	'MESSENGER_ATTACHMENT_NOT_FOUND';

export class MessengerChatNotFoundException extends NotFoundException {
	constructor() {
		super({
			code: MESSENGER_CHAT_NOT_FOUND_CODE,
			message: 'This conversation does not exist.',
		});
	}
}

/** Facebook only allows answering a person for 24 hours after their last message. */
export class MessengerReplyWindowClosedException extends ConflictException {
	constructor() {
		super({
			code: MESSENGER_REPLY_WINDOW_CLOSED_CODE,
			message:
				'More than 24 hours passed since this person last wrote, so Facebook no longer allows answering. Wait for their next message.',
		});
	}
}

/** The person blocked the Page, or Facebook cannot deliver to them any more. */
export class MessengerChatUnavailableException extends ConflictException {
	constructor(reason: string) {
		super({
			code: MESSENGER_CHAT_UNAVAILABLE_CODE,
			message: `Facebook could not deliver the message: ${reason}`,
			reason,
		});
	}
}

export class MessengerCustomerNotFoundException extends NotFoundException {
	constructor() {
		super({
			code: MESSENGER_CUSTOMER_NOT_FOUND_CODE,
			message: 'This customer does not exist.',
		});
	}
}

export class MessengerCustomerAlreadyLinkedException extends ConflictException {
	constructor() {
		super({
			code: MESSENGER_CUSTOMER_ALREADY_LINKED_CODE,
			message: 'This customer is already linked to another Messenger contact.',
		});
	}
}

export class MessengerAttachmentNotFoundException extends NotFoundException {
	constructor() {
		super({
			code: MESSENGER_ATTACHMENT_NOT_FOUND_CODE,
			message: 'This message has no such file.',
		});
	}
}

export class MessengerMessageNotFoundException extends NotFoundException {
	constructor() {
		super({
			code: MESSENGER_MESSAGE_NOT_FOUND_CODE,
			message: 'This message does not exist.',
		});
	}
}
