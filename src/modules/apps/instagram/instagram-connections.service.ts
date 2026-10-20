import { Model } from 'mongoose';

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { AesGcmCipher } from '../../../infra/aes-gcm-cipher/aes-gcm-cipher';
import { schemasName } from '../../../infra/database/mongo/schemas';
import { IAppConnectionStatus } from '../core/status/app-status.types';
import AppsEnum from '../interfaces/apps.enum';
import { IInstagramConnection } from './instagram-connection.interface';
import { InstagramConnection } from './instagram-connection.schema';
import { IInstagramAccount, IInstagramToken } from './instagram.types';

/**
 * Where the Instagram app keeps whose account is connected. The token only
 * exists encrypted in the database and is never returned by a normal query.
 */
@Injectable()
export class InstagramConnectionsService {
	//#region Constructor

	constructor(
		@InjectModel(schemasName.instagramConnection)
		private readonly _connectionModel: Model<InstagramConnection>,
		private readonly _cipher: AesGcmCipher,
	) {}

	//#endregion

	//#region Public Methods

	public async findByOwner(
		ownerUserId: string,
	): Promise<IInstagramConnection | null> {
		return await this._connectionModel.findOne({ ownerUserId });
	}

	public async findWithToken(
		ownerUserId: string,
	): Promise<IInstagramConnection | null> {
		return await this._connectionModel
			.findOne({ ownerUserId })
			.select('+token');
	}

	/** The connection of an account, as the webhook names it. */
	public async findByAccountId(
		instagramUserId: string,
	): Promise<IInstagramConnection | null> {
		return await this._connectionModel
			.findOne({ instagramUserId })
			.select('+token');
	}

	public readToken(connection: IInstagramConnection): string {
		return this._cipher.decrypt<{ accessToken: string }>(connection.token)
			.accessToken;
	}

	/** Connecting again replaces the user's previous account. */
	public async saveConnected(
		ownerUserId: string,
		account: IInstagramAccount,
		token: IInstagramToken,
	): Promise<IInstagramConnection> {
		return await this._connectionModel.findOneAndUpdate(
			{ ownerUserId },
			{
				$set: {
					status: AppsEnum.ConnectionStatus.CONNECTED,
					instagramUserId: account.userId,
					username: account.username,
					name: account.name,
					profilePictureUrl: account.profilePictureUrl,
					token: this._cipher.encrypt({ accessToken: token.accessToken }),
					tokenExpiresAt: token.expiresAt,
					connectedAt: new Date(),
					lastUpdateAt: null,
				},
			},
			{ upsert: true, new: true, setDefaultsOnInsert: true },
		);
	}

	/** A renewed token: the connection is good for another 60 days. */
	public async updateToken(
		connectionId: string,
		token: IInstagramToken,
	): Promise<void> {
		await this._connectionModel.updateOne(
			{ _id: connectionId },
			{
				$set: {
					token: this._cipher.encrypt({ accessToken: token.accessToken }),
					tokenExpiresAt: token.expiresAt,
					status: AppsEnum.ConnectionStatus.CONNECTED,
				},
			},
		);
	}

	/** The token no longer works: the user has to connect again. */
	public async markExpired(connectionId: string): Promise<void> {
		await this._connectionModel.updateOne(
			{ _id: connectionId },
			{ $set: { status: AppsEnum.ConnectionStatus.EXPIRED } },
		);
	}

	public isTokenExpired(connection: IInstagramConnection): boolean {
		return new Date(connection.tokenExpiresAt).getTime() <= Date.now();
	}

	public async touchLastUpdate(connectionId: string, at: Date): Promise<void> {
		await this._connectionModel.updateOne(
			{ _id: connectionId },
			{ $set: { lastUpdateAt: at } },
		);
	}

	public async deleteByOwner(ownerUserId: string): Promise<void> {
		await this._connectionModel.deleteOne({ ownerUserId });
	}

	/** The short answer the apps catalog needs. */
	public async getStatus(ownerUserId: string): Promise<IAppConnectionStatus> {
		const connection: IInstagramConnection | null =
			await this.findByOwner(ownerUserId);

		if (!connection) {
			return { connected: false, status: null, accountLabel: null };
		}

		const isExpired: boolean =
			connection.status === AppsEnum.ConnectionStatus.EXPIRED ||
			this.isTokenExpired(connection);

		return {
			connected: !isExpired,
			status: isExpired
				? AppsEnum.ConnectionStatus.EXPIRED
				: AppsEnum.ConnectionStatus.CONNECTED,
			accountLabel: `@${connection.username}`,
		};
	}

	//#endregion
}
