import { Model } from 'mongoose';

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { AesGcmCipher } from '../../../infra/aes-gcm-cipher/aes-gcm-cipher';
import { schemasName } from '../../../infra/database/mongo/schemas';
import { IAppConnectionStatus } from '../core/status/app-status.types';
import AppsEnum from '../interfaces/apps.enum';
import {
	IMessengerConnection,
	IPendingMessengerPage,
} from './messenger-connection.interface';
import { MessengerConnection } from './messenger-connection.schema';
import { IMetaPage } from './messenger.types';

// How long the user has, after logging in, to pick one of several Pages.
const PENDING_MINUTES: number = 15;

/**
 * Where the Messenger app keeps whose Page is connected. Tokens only exist
 * encrypted in the database and are never returned by a normal query.
 */
@Injectable()
export class MessengerConnectionsService {
	//#region Constructor

	constructor(
		@InjectModel(schemasName.messengerConnection)
		private readonly _connectionModel: Model<MessengerConnection>,
		private readonly _cipher: AesGcmCipher,
	) {}

	//#endregion

	//#region Public Methods

	public async findByOwner(
		ownerUserId: string,
	): Promise<IMessengerConnection | null> {
		return await this._connectionModel.findOne({ ownerUserId });
	}

	public async findWithToken(
		ownerUserId: string,
	): Promise<IMessengerConnection | null> {
		return await this._connectionModel
			.findOne({ ownerUserId, pageId: { $exists: true } })
			.select('+token');
	}

	public async findByPageId(
		pageId: string,
	): Promise<IMessengerConnection | null> {
		return await this._connectionModel.findOne({ pageId }).select('+token');
	}

	public readToken(connection: IMessengerConnection): string {
		return this._cipher.decrypt<{ pageToken: string }>(connection.token)
			.pageToken;
	}

	/** Connecting again replaces the user's previous Page. */
	public async saveConnected(
		ownerUserId: string,
		page: IMetaPage,
	): Promise<IMessengerConnection> {
		return await this._connectionModel.findOneAndUpdate(
			{ ownerUserId },
			{
				$set: {
					status: AppsEnum.ConnectionStatus.CONNECTED,
					pageId: page.id,
					pageName: page.name,
					token: this._cipher.encrypt({ pageToken: page.accessToken }),
					connectedAt: new Date(),
					lastUpdateAt: null,
				},
				$unset: { pendingPages: '', pendingExpiresAt: '' },
			},
			{ upsert: true, new: true, setDefaultsOnInsert: true },
		);
	}

	/** The login brought several Pages: keep them, encrypted, until the user picks one. */
	public async savePending(
		ownerUserId: string,
		pages: IMetaPage[],
	): Promise<void> {
		await this._connectionModel.updateOne(
			{ ownerUserId },
			{
				$set: {
					pendingPages: pages.map(
						(page: IMetaPage): IPendingMessengerPage => ({
							pageId: page.id,
							pageName: page.name,
							token: this._cipher.encrypt({ pageToken: page.accessToken }),
						}),
					),
					pendingExpiresAt: new Date(Date.now() + PENDING_MINUTES * 60_000),
				},
			},
			{ upsert: true },
		);
	}

	/** The Page the user picked, if it is on the list and the list is still fresh. */
	public async findPending(
		ownerUserId: string,
		pageId: string,
	): Promise<IMetaPage | null> {
		const connection: IMessengerConnection | null = await this._connectionModel
			.findOne({ ownerUserId })
			.select('+pendingPages');

		const pending: IPendingMessengerPage | undefined = this._isFresh(connection)
			? connection.pendingPages?.find(
					(page: IPendingMessengerPage) => page.pageId === pageId,
			  )
			: undefined;

		return pending
			? {
					id: pending.pageId,
					name: pending.pageName,
					accessToken: this._cipher.decrypt<{ pageToken: string }>(
						pending.token,
					).pageToken,
			  }
			: null;
	}

	/** What the user can choose from: names only. */
	public async listPending(
		ownerUserId: string,
	): Promise<{ pageId: string; pageName: string }[]> {
		const connection: IMessengerConnection | null = await this._connectionModel
			.findOne({ ownerUserId })
			.select('+pendingPages');

		return this._isFresh(connection)
			? (connection.pendingPages ?? []).map((page: IPendingMessengerPage) => ({
					pageId: page.pageId,
					pageName: page.pageName,
			  }))
			: [];
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
		const connection: IMessengerConnection | null =
			await this.findByOwner(ownerUserId);

		const isConnected: boolean =
			!!connection?.pageId &&
			connection.status === AppsEnum.ConnectionStatus.CONNECTED;

		return {
			connected: isConnected,
			status: isConnected ? connection.status : null,
			accountLabel: isConnected ? connection.pageName : null,
		};
	}

	//#endregion

	//#region Private Methods

	private _isFresh(connection: IMessengerConnection | null): boolean {
		return (
			!!connection?.pendingExpiresAt &&
			connection.pendingExpiresAt.getTime() > Date.now()
		);
	}

	//#endregion
}
