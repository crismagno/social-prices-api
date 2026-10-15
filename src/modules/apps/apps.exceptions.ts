import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	NotFoundException,
} from '@nestjs/common';

export const APP_NOT_ENABLED_CODE: string = 'APP_NOT_ENABLED';
export const APP_NOT_INTEGRATED_CODE: string = 'APP_NOT_INTEGRATED';
export const APP_NOT_CONNECTED_CODE: string = 'APP_NOT_CONNECTED';
export const APP_CONNECTION_EXPIRED_CODE: string = 'APP_CONNECTION_EXPIRED';
export const APP_SYNC_NOT_SUPPORTED_CODE: string = 'APP_SYNC_NOT_SUPPORTED';
export const APP_PROVIDER_ACCESS_DENIED_CODE: string =
	'APP_PROVIDER_ACCESS_DENIED';

export class AppNotEnabledException extends ForbiddenException {
	constructor(appId: string) {
		super({
			code: APP_NOT_ENABLED_CODE,
			message: `App ${appId} is not enabled for this user.`,
		});
	}
}

export class AppNotIntegratedException extends NotFoundException {
	constructor(appId: string) {
		super({
			code: APP_NOT_INTEGRATED_CODE,
			message: `App ${appId} has no integration yet.`,
		});
	}
}

// 409 (not 401) for the two below so the client never reads an expired
// third-party token as an expired login.
export class AppNotConnectedException extends ConflictException {
	constructor(appId: string) {
		super({
			code: APP_NOT_CONNECTED_CODE,
			message: `App ${appId} is not connected.`,
		});
	}
}

export class AppConnectionExpiredException extends ConflictException {
	constructor(appId: string) {
		super({
			code: APP_CONNECTION_EXPIRED_CODE,
			message: `The ${appId} connection expired. Connect again.`,
		});
	}
}

export class AppSyncNotSupportedException extends BadRequestException {
	constructor(appId: string) {
		super({
			code: APP_SYNC_NOT_SUPPORTED_CODE,
			message: `App ${appId} does not support sync.`,
		});
	}
}

// 409 as well: the provider refused the call, which is not a problem with the
// user's login to this platform.
export class AppProviderAccessDeniedException extends ConflictException {
	constructor(appId: string, reason: string) {
		super({
			code: APP_PROVIDER_ACCESS_DENIED_CODE,
			message: `${appId} denied access${
				reason ? ` (${reason})` : ''
			}. Check that the API is enabled in the provider's console and that every permission was granted when connecting.`,
			reason,
		});
	}
}
