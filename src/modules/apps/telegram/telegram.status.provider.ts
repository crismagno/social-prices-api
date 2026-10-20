import { Injectable } from '@nestjs/common';

import {
	IAppConnectionStatus,
	IAppStatusProvider,
} from '../core/status/app-status.types';
import AppsEnum from '../interfaces/apps.enum';
import { TelegramChatsService } from './telegram-chats.service';
import { TelegramConnectionsService } from './telegram-connections.service';

/** How the apps catalog asks Telegram whether the user has a bot connected. */
@Injectable()
export class TelegramStatusProvider implements IAppStatusProvider {
	public readonly appId: AppsEnum.App = AppsEnum.App.TELEGRAM;

	constructor(
		private readonly _connectionsService: TelegramConnectionsService,
		private readonly _chatsService: TelegramChatsService,
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
