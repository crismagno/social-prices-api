import { Inject, Injectable } from '@nestjs/common';

import { IUser } from '../users/interfaces/user.interface';
import { UsersService } from '../users/users.service';
import {
	APP_STATUS_PROVIDERS,
	IAppConnectionStatus,
	IAppStatusProvider,
} from './core/status/app-status.types';
import AppsEnum from './interfaces/apps.enum';
import { IAppCatalogItem } from './interfaces/apps.types';

const NOT_CONNECTED: IAppConnectionStatus = {
	connected: false,
	status: null,
	accountLabel: null,
};

/**
 * Only what every app has in common: is it enabled for this user, and is it
 * connected. Each app answers the second through its own status provider; an
 * app without one is a catalog-only card.
 */
@Injectable()
export class AppsService {
	//#region Constructor

	constructor(
		private readonly _usersService: UsersService,
		@Inject(APP_STATUS_PROVIDERS)
		private readonly _statusProviders: IAppStatusProvider[],
	) {}

	//#endregion

	//#region Public Methods

	public async getCatalog(ownerUserId: string): Promise<IAppCatalogItem[]> {
		const user: IUser = await this._usersService.findOneByIdOrFail(ownerUserId);
		const enabledApps: AppsEnum.App[] = user.enabledApps ?? [];

		return await Promise.all(
			Object.values(AppsEnum.App).map(async (appId: AppsEnum.App) => {
				const provider: IAppStatusProvider | undefined =
					this._statusProviders.find(
						(candidate: IAppStatusProvider) => candidate.appId === appId,
					);

				const connection: IAppConnectionStatus = provider
					? await provider.getStatus(ownerUserId)
					: NOT_CONNECTED;

				return {
					id: appId,
					enabled: enabledApps.includes(appId),
					integrated: !!provider,
					...connection,
				};
			}),
		);
	}

	//#endregion
}
