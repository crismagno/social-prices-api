import { ConflictException } from '@nestjs/common';

export const GOOGLE_CONTACTS_NOT_CONNECTED_CODE: string =
	'GOOGLE_CONTACTS_NOT_CONNECTED';
export const GOOGLE_CONTACTS_CONNECTION_EXPIRED_CODE: string =
	'GOOGLE_CONTACTS_CONNECTION_EXPIRED';
export const GOOGLE_CONTACTS_ACCESS_DENIED_CODE: string =
	'GOOGLE_CONTACTS_ACCESS_DENIED';

// 409 (not 401) for these so the client never reads a Google problem as an
// expired login to this platform.
export class GoogleContactsNotConnectedException extends ConflictException {
	constructor() {
		super({
			code: GOOGLE_CONTACTS_NOT_CONNECTED_CODE,
			message: 'Google Contacts is not connected.',
		});
	}
}

export class GoogleContactsConnectionExpiredException extends ConflictException {
	constructor() {
		super({
			code: GOOGLE_CONTACTS_CONNECTION_EXPIRED_CODE,
			message: 'The Google Contacts connection expired. Connect again.',
		});
	}
}

export class GoogleContactsAccessDeniedException extends ConflictException {
	constructor(reason: string) {
		super({
			code: GOOGLE_CONTACTS_ACCESS_DENIED_CODE,
			message: `Google denied access${
				reason ? ` (${reason})` : ''
			}. Check that the People API is enabled in the Google Cloud project and that every permission was granted when connecting.`,
			reason,
		});
	}
}
