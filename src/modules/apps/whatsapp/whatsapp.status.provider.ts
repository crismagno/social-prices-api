import { Injectable } from '@nestjs/common';

import { InboxConversationsService } from '../../inbox/inbox-conversations.service';
import InboxEnum from '../../inbox/interfaces/inbox.enum';
import {
	IAppConnectionStatus,
	IAppStatusProvider,
} from '../core/status/app-status.types';
import AppsEnum from '../interfaces/apps.enum';
import { WhatsappConnectionsService } from './whatsapp-connections.service';

/** How the apps catalog asks WhatsApp whether the user has a number connected. */
@Injectable()
export class WhatsappStatusProvider implements IAppStatusProvider {
	public readonly appId: AppsEnum.App = AppsEnum.App.WHATSAPP;

	constructor(
		private readonly _connectionsService: WhatsappConnectionsService,
		private readonly _conversations: InboxConversationsService,
	) {}

	public async getStatus(ownerUserId: string): Promise<IAppConnectionStatus> {
		const status: IAppConnectionStatus =
			await this._connectionsService.getStatus(ownerUserId);

		return status.connected
			? {
					...status,
					unreadCount: await this._conversations.countUnread(
						ownerUserId,
						InboxEnum.Channel.WHATSAPP,
					),
			  }
			: status;
	}
}
