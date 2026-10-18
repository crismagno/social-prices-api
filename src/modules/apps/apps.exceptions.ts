import { ConflictException, ForbiddenException } from '@nestjs/common';

export const APP_NOT_ENABLED_CODE: string = 'APP_NOT_ENABLED';

export class AppNotEnabledException extends ForbiddenException {
	constructor(appId: string) {
		super({
			code: APP_NOT_ENABLED_CODE,
			message: `App ${appId} is not enabled for this user.`,
		});
	}
}
