import { Model } from 'mongoose';

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../../infra/database/mongo/schemas';
import { AppCredentialsVault } from '../credentials/app-credentials.vault';
import { IAppConnection } from '../interfaces/app-connection.interface';
import { AppConnection } from '../interfaces/app-connection.schema';
import AppsEnum from '../interfaces/apps.enum';
import { IAppImportResult } from '../interfaces/apps.types';

export interface IUpsertAppConnectionInput {
	ownerUserId: string;
	appId: AppsEnum.App;
	accountLabel: string | null;
	credentials: object;
	scopes: string[];
	expiresAt: Date | null;
}

@Injectable()
export class AppConnectionsService {
	//#region Constructor

	constructor(
		@InjectModel(schemasName.appConnection)
		private readonly _connectionModel: Model<AppConnection>,
		private readonly _vault: AppCredentialsVault,
	) {}

	//#endregion

	//#region Public Methods

	public async findByOwner(ownerUserId: string): Promise<IAppConnection[]> {
		return await this._connectionModel.find({ ownerUserId });
	}

	public async findWithCredentials(
		ownerUserId: string,
		appId: AppsEnum.App,
	): Promise<IAppConnection | null> {
		return await this._connectionModel
			.findOne({ ownerUserId, appId })
			.select('+credentials');
	}

	public readCredentials<T extends object>(connection: IAppConnection): T {
		return this._vault.decrypt<T>(connection.credentials);
	}

	public async upsert(
		input: IUpsertAppConnectionInput,
	): Promise<IAppConnection> {
		return await this._connectionModel.findOneAndUpdate(
			{ ownerUserId: input.ownerUserId, appId: input.appId },
			{
				$set: {
					status: AppsEnum.ConnectionStatus.CONNECTED,
					accountLabel: input.accountLabel,
					credentials: this._vault.encrypt(input.credentials),
					scopes: input.scopes,
					expiresAt: input.expiresAt,
					connectedAt: new Date(),
				},
			},
			{ upsert: true, new: true, setDefaultsOnInsert: true },
		);
	}

	public async updateTokens(
		connectionId: string,
		credentials: object,
		expiresAt: Date | null,
	): Promise<void> {
		await this._connectionModel.updateOne(
			{ _id: connectionId },
			{
				$set: {
					credentials: this._vault.encrypt(credentials),
					expiresAt,
					status: AppsEnum.ConnectionStatus.CONNECTED,
				},
			},
		);
	}

	public async markStatus(
		connectionId: string,
		status: AppsEnum.ConnectionStatus,
	): Promise<void> {
		await this._connectionModel.updateOne(
			{ _id: connectionId },
			{ $set: { status } },
		);
	}

	public async saveSyncResult(
		connectionId: string,
		summary: IAppImportResult,
	): Promise<void> {
		await this._connectionModel.updateOne(
			{ _id: connectionId },
			{
				$set: {
					lastSyncAt: summary.finishedAt,
					lastSyncSummary: summary,
				},
			},
		);
	}

	public async deleteByOwnerAndApp(
		ownerUserId: string,
		appId: AppsEnum.App,
	): Promise<void> {
		await this._connectionModel.deleteOne({ ownerUserId, appId });
	}

	//#endregion
}
