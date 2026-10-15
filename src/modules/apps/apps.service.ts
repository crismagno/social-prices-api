import { Injectable } from '@nestjs/common';

import { IUser } from '../users/interfaces/user.interface';
import { UsersService } from '../users/users.service';
import { AppSyncNotSupportedException } from './apps.exceptions';
import { AppsRegistry } from './apps.registry';
import { AppConnectionsService } from './connections/app-connections.service';
import { IAppConnection } from './interfaces/app-connection.interface';
import AppsEnum from './interfaces/apps.enum';
import {
	IAppCatalogItem,
	IAppContext,
	IAppImportResponse,
	IAppSyncPreview,
} from './interfaces/apps.types';

@Injectable()
export class AppsService {
	//#region Constructor

	constructor(
		private readonly _usersService: UsersService,
		private readonly _connectionsService: AppConnectionsService,
		private readonly _registry: AppsRegistry,
	) {}

	//#endregion

	//#region Public Methods

	public async getCatalog(ownerUserId: string): Promise<IAppCatalogItem[]> {
		const user: IUser = await this._usersService.findOneByIdOrFail(ownerUserId);
		const connections: IAppConnection[] =
			await this._connectionsService.findByOwner(ownerUserId);
		const enabledApps: AppsEnum.App[] = user.enabledApps ?? [];

		return Object.values(AppsEnum.App).map((appId: AppsEnum.App) => {
			const connection: IAppConnection | null =
				connections.find((c: IAppConnection) => c.appId === appId) ?? null;

			return {
				id: appId,
				enabled: enabledApps.includes(appId),
				integrated: this._registry.has(appId),
				connected: connection?.status === AppsEnum.ConnectionStatus.CONNECTED,
				status: connection?.status ?? null,
				accountLabel: connection?.accountLabel ?? null,
				lastSyncAt: connection?.lastSyncAt ?? null,
				lastSyncSummary: connection?.lastSyncSummary ?? null,
			};
		});
	}

	public async connect(
		appId: AppsEnum.App,
		ctx: IAppContext,
	): Promise<{ url: string }> {
		return { url: await this._registry.get(appId).getConnectUrl(ctx) };
	}

	public async handleCallback(
		appId: AppsEnum.App,
		params: Record<string, string>,
	): Promise<{ redirectTo: string }> {
		return await this._registry.get(appId).handleCallback(params);
	}

	public async disconnect(
		appId: AppsEnum.App,
		ctx: IAppContext,
	): Promise<void> {
		await this._registry.get(appId).disconnect(ctx);
	}

	public async sync(
		appId: AppsEnum.App,
		ctx: IAppContext,
	): Promise<IAppSyncPreview> {
		const integration = this._registry.get(appId);

		if (!integration.sync) {
			throw new AppSyncNotSupportedException(appId);
		}

		return await integration.sync(ctx);
	}

	public async importSelected(
		appId: AppsEnum.App,
		ctx: IAppContext,
		externalIds: string[],
	): Promise<IAppImportResponse> {
		const integration = this._registry.get(appId);

		if (!integration.importSelected) {
			throw new AppSyncNotSupportedException(appId);
		}

		return await integration.importSelected(ctx, externalIds);
	}

	//#endregion
}
