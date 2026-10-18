import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import AuthEnum from '../../../auth/interfaces/auth.enum';
import { IAuthPayload } from '../../../auth/interfaces/auth.types';
import { IUser } from '../../../users/interfaces/user.interface';
import { UsersService } from '../../../users/users.service';
import { AppNotEnabledException } from '../../apps.exceptions';
import AppsEnum from '../../interfaces/apps.enum';
import { REQUIRES_APP_KEY } from './requires-app.decorator';

/**
 * Runs after the global AuthGuard. The manager's switch is read fresh from the
 * database on every call, so disabling an app takes effect immediately and not
 * when the user's 30-day token expires. The app comes from @RequiresApp; a
 * route nobody marked is refused rather than let through.
 */
@Injectable()
export class AppEnabledGuard implements CanActivate {
	constructor(
		private readonly _usersService: UsersService,
		private readonly _reflector: Reflector,
	) {}

	public async canActivate(context: ExecutionContext): Promise<boolean> {
		const app: AppsEnum.App | undefined =
			this._reflector.getAllAndOverride<AppsEnum.App>(REQUIRES_APP_KEY, [
				context.getHandler(),
				context.getClass(),
			]);

		const request: any = context.switchToHttp().getRequest();
		const payload: IAuthPayload = request[AuthEnum.RequestProps.AUTH_PAYLOAD];

		const user: IUser | undefined = app
			? await this._usersService.findOneById(payload?._id)
			: undefined;

		if (!app || !user?.enabledApps?.includes(app)) {
			throw new AppNotEnabledException(String(app));
		}

		return true;
	}
}
