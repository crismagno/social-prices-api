import { Model } from 'mongoose';

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../../infra/database/mongo/schemas';
import { AesGcmCipher } from '../../../infra/aes-gcm-cipher/aes-gcm-cipher';
import AppsEnum from '../interfaces/apps.enum';
import { IAppConnectionStatus } from '../core/status/app-status.types';
import { IGoogleContactsConnection } from './google-contacts-connection.interface';
import { GoogleContactsConnection } from './google-contacts-connection.schema';
import {
	IGoogleContactsImportResult,
	IGoogleTokens,
} from './google-contacts.types';

export interface ISaveGoogleContactsConnectionInput {
	ownerUserId: string;
	googleEmail: string | null;
	tokens: IGoogleTokens;
	grantedScopes: string[];
	accessTokenExpiresAt: Date | null;
}

/**
 * Where Google Contacts keeps who is connected and with which tokens. The
 * tokens only exist encrypted in the database and are never returned by a
 * normal query.
 */
@Injectable()
export class GoogleContactsConnectionsService {
	//#region Constructor

	constructor(
		@InjectModel(schemasName.googleContactsConnection)
		private readonly _connectionModel: Model<GoogleContactsConnection>,
		private readonly _cipher: AesGcmCipher,
	) {}

	//#endregion

	//#region Public Methods

	public async findByOwner(
		ownerUserId: string,
	): Promise<IGoogleContactsConnection | null> {
		return await this._connectionModel.findOne({ ownerUserId });
	}

	public async findWithTokens(
		ownerUserId: string,
	): Promise<IGoogleContactsConnection | null> {
		return await this._connectionModel
			.findOne({ ownerUserId })
			.select('+tokens');
	}

	public readTokens(connection: IGoogleContactsConnection): IGoogleTokens {
		return this._cipher.decrypt<IGoogleTokens>(connection.tokens);
	}

	/** Connecting again replaces the previous account of that user. */
	public async saveConnection(
		input: ISaveGoogleContactsConnectionInput,
	): Promise<IGoogleContactsConnection> {
		return await this._connectionModel.findOneAndUpdate(
			{ ownerUserId: input.ownerUserId },
			{
				$set: {
					status: AppsEnum.ConnectionStatus.CONNECTED,
					googleEmail: input.googleEmail,
					tokens: this._cipher.encrypt(input.tokens),
					grantedScopes: input.grantedScopes,
					accessTokenExpiresAt: input.accessTokenExpiresAt,
					connectedAt: new Date(),
				},
			},
			{ upsert: true, new: true, setDefaultsOnInsert: true },
		);
	}

	public async updateAccessToken(
		connectionId: string,
		tokens: IGoogleTokens,
		accessTokenExpiresAt: Date | null,
	): Promise<void> {
		await this._connectionModel.updateOne(
			{ _id: connectionId },
			{
				$set: {
					tokens: this._cipher.encrypt(tokens),
					accessTokenExpiresAt,
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

	public async saveImportResult(
		connectionId: string,
		result: IGoogleContactsImportResult,
	): Promise<void> {
		await this._connectionModel.updateOne(
			{ _id: connectionId },
			{ $set: { lastImportAt: result.finishedAt, lastImport: result } },
		);
	}

	public async deleteByOwner(ownerUserId: string): Promise<void> {
		await this._connectionModel.deleteOne({ ownerUserId });
	}

	/** The short answer the apps catalog needs. */
	public async getStatus(ownerUserId: string): Promise<IAppConnectionStatus> {
		const connection: IGoogleContactsConnection | null =
			await this.findByOwner(ownerUserId);

		return {
			connected: connection?.status === AppsEnum.ConnectionStatus.CONNECTED,
			status: connection?.status ?? null,
			accountLabel: connection?.googleEmail ?? null,
		};
	}

	//#endregion
}
