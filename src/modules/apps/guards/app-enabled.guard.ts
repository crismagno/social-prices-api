import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

import AuthEnum from '../../auth/interfaces/auth.enum';
import { IAuthPayload } from '../../auth/interfaces/auth.types';
import { IUser } from '../../users/interfaces/user.interface';
import { UsersService } from '../../users/users.service';
import { AppNotEnabledException } from '../apps.exceptions';
import AppsEnum from '../interfaces/apps.enum';

/**
 * Runs after the global AuthGuard. The manager's switch is read fresh from the
 * database on every call, so disabling an app takes effect immediately and not
 * when the user's 30-day token expires.
 */
@Injectable()
export class AppEnabledGuard implements CanActivate {
	constructor(private readonly _usersService: UsersService) {}

	public async canActivate(context: ExecutionContext): Promise<boolean> {
		const request: any = context.switchToHttp().getRequest();
		const payload: IAuthPayload = request[AuthEnum.RequestProps.AUTH_PAYLOAD];
		const appId: string = request.params?.appId;

		const user: IUser | undefined = await this._usersService.findOneById(
			payload?._id,
		);

		if (!user?.enabledApps?.includes(appId as AppsEnum.App)) {
			throw new AppNotEnabledException(appId);
		}

		return true;
	}
}
