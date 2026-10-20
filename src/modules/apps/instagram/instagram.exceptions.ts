import { ConflictException, NotFoundException } from '@nestjs/common';

export const INSTAGRAM_NOT_CONNECTED_CODE: string = 'INSTAGRAM_NOT_CONNECTED';
export const INSTAGRAM_ACCOUNT_ALREADY_CONNECTED_CODE: string =
	'INSTAGRAM_ACCOUNT_ALREADY_CONNECTED';
export const INSTAGRAM_ACCOUNT_SUBSCRIBE_FAILED_CODE: string =
	'INSTAGRAM_ACCOUNT_SUBSCRIBE_FAILED';

export class InstagramNotConnectedException extends ConflictException {
	constructor() {
		super({
			code: INSTAGRAM_NOT_CONNECTED_CODE,
			message: 'No Instagram account is connected.',
		});
	}
}

export class InstagramAccountAlreadyConnectedException extends ConflictException {
	constructor() {
		super({
			code: INSTAGRAM_ACCOUNT_ALREADY_CONNECTED_CODE,
			message: 'This Instagram account is already connected to another user.',
		});
	}
}

export class InstagramAccountSubscribeFailedException extends ConflictException {
	constructor(reason: string) {
		super({
			code: INSTAGRAM_ACCOUNT_SUBSCRIBE_FAILED_CODE,
			message: `Instagram did not let this app receive the messages of the account: ${reason}`,
			reason,
		});
	}
}

export const INSTAGRAM_CHAT_NOT_FOUND_CODE: string = 'INSTAGRAM_CHAT_NOT_FOUND';
export const INSTAGRAM_REPLY_WINDOW_CLOSED_CODE: string =
	'INSTAGRAM_REPLY_WINDOW_CLOSED';
export const INSTAGRAM_CHAT_UNAVAILABLE_CODE: string =
	'INSTAGRAM_CHAT_UNAVAILABLE';
export const INSTAGRAM_CUSTOMER_NOT_FOUND_CODE: string =
	'INSTAGRAM_CUSTOMER_NOT_FOUND';
export const INSTAGRAM_CUSTOMER_ALREADY_LINKED_CODE: string =
	'INSTAGRAM_CUSTOMER_ALREADY_LINKED';
export const INSTAGRAM_ATTACHMENT_NOT_FOUND_CODE: string =
	'INSTAGRAM_ATTACHMENT_NOT_FOUND';

export class InstagramChatNotFoundException extends NotFoundException {
	constructor() {
		super({
			code: INSTAGRAM_CHAT_NOT_FOUND_CODE,
			message: 'This conversation does not exist.',
		});
	}
}

/** Instagram only allows answering a person for 24 hours after their last message. */
export class InstagramReplyWindowClosedException extends ConflictException {
	constructor() {
		super({
			code: INSTAGRAM_REPLY_WINDOW_CLOSED_CODE,
			message:
				'More than 24 hours passed since this person last wrote, so Instagram no longer allows answering. Wait for their next message.',
		});
	}
}

/** The person blocked the account, or Instagram cannot deliver to them any more. */
export class InstagramChatUnavailableException extends ConflictException {
	constructor(reason: string) {
		super({
			code: INSTAGRAM_CHAT_UNAVAILABLE_CODE,
			message: `Instagram could not deliver the message: ${reason}`,
			reason,
		});
	}
}

export class InstagramCustomerNotFoundException extends NotFoundException {
	constructor() {
		super({
			code: INSTAGRAM_CUSTOMER_NOT_FOUND_CODE,
			message: 'This customer does not exist.',
		});
	}
}

export class InstagramCustomerAlreadyLinkedException extends ConflictException {
	constructor() {
		super({
			code: INSTAGRAM_CUSTOMER_ALREADY_LINKED_CODE,
			message: 'This customer is already linked to another Instagram contact.',
		});
	}
}

export class InstagramAttachmentNotFoundException extends NotFoundException {
	constructor() {
		super({
			code: INSTAGRAM_ATTACHMENT_NOT_FOUND_CODE,
			message: 'This message has no such file.',
		});
	}
}

export const INSTAGRAM_CONNECTION_EXPIRED_CODE: string =
	'INSTAGRAM_CONNECTION_EXPIRED';

/** The token ran out (it lasts 60 days without use): the user connects again. */
export class InstagramConnectionExpiredException extends ConflictException {
	constructor() {
		super({
			code: INSTAGRAM_CONNECTION_EXPIRED_CODE,
			message: 'The Instagram connection expired. Connect again.',
		});
	}
}
