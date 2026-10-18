import { Injectable } from '@nestjs/common';

import {
	IAppConnectionStatus,
	IAppStatusProvider,
} from '../core/status/app-status.types';
import AppsEnum from '../interfaces/apps.enum';
import { GoogleContactsConnectionsService } from './google-contacts-connections.service';

/** How the apps catalog asks Google Contacts whether the user is connected. */
@Injectable()
export class GoogleContactsStatusProvider implements IAppStatusProvider {
	public readonly appId: AppsEnum.App = AppsEnum.App.GOOGLE_CONTACTS;

	constructor(
		private readonly _connectionsService: GoogleContactsConnectionsService,
	) {}

	public async getStatus(ownerUserId: string): Promise<IAppConnectionStatus> {
		return await this._connectionsService.getStatus(ownerUserId);
	}
}
