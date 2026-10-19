import { Injectable } from '@nestjs/common';

import {
	IAppConnectionStatus,
	IAppStatusProvider,
} from '../core/status/app-status.types';
import AppsEnum from '../interfaces/apps.enum';
import { MessengerConnectionsService } from './messenger-connections.service';

/** How the apps catalog asks Messenger whether the user has a Page connected. */
@Injectable()
export class MessengerStatusProvider implements IAppStatusProvider {
	public readonly appId: AppsEnum.App = AppsEnum.App.FACEBOOK;

	constructor(
		private readonly _connectionsService: MessengerConnectionsService,
	) {}

	public async getStatus(ownerUserId: string): Promise<IAppConnectionStatus> {
		return await this._connectionsService.getStatus(ownerUserId);
	}
}
