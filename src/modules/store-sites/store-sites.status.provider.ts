import { Injectable } from '@nestjs/common';

import {
	IAppConnectionStatus,
	IAppStatusProvider,
} from '../apps/core/status/app-status.types';
import AppsEnum from '../apps/interfaces/apps.enum';
import { InboxConversationsService } from '../inbox/inbox-conversations.service';
import InboxEnum from '../inbox/interfaces/inbox.enum';
import { IStoreSite } from './interfaces/store-site.interface';
import { StoreSitesService } from './store-sites.service';

/**
 * How the apps catalog asks the site app whether the user has a site online,
 * and how many messages of its chat wait to be read (the menu shows them).
 */
@Injectable()
export class StoreSitesStatusProvider implements IAppStatusProvider {
	public readonly appId: AppsEnum.App = AppsEnum.App.SITE;

	constructor(
		private readonly _storeSitesService: StoreSitesService,
		private readonly _conversations: InboxConversationsService,
	) {}

	public async getStatus(ownerUserId: string): Promise<IAppConnectionStatus> {
		const site: IStoreSite | null =
			await this._storeSitesService.findPublishedByOwner(ownerUserId);

		return site
			? {
					connected: true,
					status: AppsEnum.ConnectionStatus.CONNECTED,
					accountLabel: site.slug,
					unreadCount: await this._conversations.countUnread(
						ownerUserId,
						InboxEnum.Channel.SITE,
					),
			  }
			: { connected: false, status: null, accountLabel: null };
	}
}
