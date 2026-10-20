import { Injectable } from '@nestjs/common';

import {
	IAppConnectionStatus,
	IAppStatusProvider,
} from '../core/status/app-status.types';
import AppsEnum from '../interfaces/apps.enum';
import { InstagramChatsService } from './instagram-chats.service';
import { InstagramConnectionsService } from './instagram-connections.service';

/** How the apps catalog asks Instagram whether the user has an account connected. */
@Injectable()
export class InstagramStatusProvider implements IAppStatusProvider {
	public readonly appId: AppsEnum.App = AppsEnum.App.INSTAGRAM;

	constructor(
		private readonly _connectionsService: InstagramConnectionsService,
		private readonly _chatsService: InstagramChatsService,
	) {}

	public async getStatus(ownerUserId: string): Promise<IAppConnectionStatus> {
		const status: IAppConnectionStatus =
			await this._connectionsService.getStatus(ownerUserId);

		return status.connected
			? {
					...status,
					unreadCount: await this._chatsService.countUnread(ownerUserId),
			  }
			: status;
	}
}
