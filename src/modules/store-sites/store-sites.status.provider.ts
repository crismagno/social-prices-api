import { Injectable } from '@nestjs/common';

import {
	IAppConnectionStatus,
	IAppStatusProvider,
} from '../apps/core/status/app-status.types';
import AppsEnum from '../apps/interfaces/apps.enum';
import { IStoreSite } from './interfaces/store-site.interface';
import { StoreSitesService } from './store-sites.service';

/** How the apps catalog asks the site app whether the user has a site online. */
@Injectable()
export class StoreSitesStatusProvider implements IAppStatusProvider {
	public readonly appId: AppsEnum.App = AppsEnum.App.SITE;

	constructor(private readonly _storeSitesService: StoreSitesService) {}

	public async getStatus(ownerUserId: string): Promise<IAppConnectionStatus> {
		const site: IStoreSite | null =
			await this._storeSitesService.findPublishedByOwner(ownerUserId);

		return site
			? {
					connected: true,
					status: AppsEnum.ConnectionStatus.CONNECTED,
					accountLabel: site.slug,
			  }
			: { connected: false, status: null, accountLabel: null };
	}
}
