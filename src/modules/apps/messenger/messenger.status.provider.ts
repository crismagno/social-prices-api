import { Injectable } from '@nestjs/common';

import {
	IAppConnectionStatus,
	IAppStatusProvider,
} from '../core/status/app-status.types';
import AppsEnum from '../interfaces/apps.enum';
import { MessengerChatsService } from './messenger-chats.service';
import { MessengerConnectionsService } from './messenger-connections.service';

/** How the apps catalog asks Messenger whether the user has a Page connected. */
@Injectable()
export class MessengerStatusProvider implements IAppStatusProvider {
	public readonly appId: AppsEnum.App = AppsEnum.App.FACEBOOK;

	constructor(
		private readonly _connectionsService: MessengerConnectionsService,
		private readonly _chatsService: MessengerChatsService,
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
