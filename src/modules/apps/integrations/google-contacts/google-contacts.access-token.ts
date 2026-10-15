import { Injectable } from '@nestjs/common';

import {
	AppConnectionExpiredException,
	AppNotConnectedException,
} from '../../apps.exceptions';
import { AppConnectionsService } from '../../connections/app-connections.service';
import { IAppConnection } from '../../interfaces/app-connection.interface';
import AppsEnum from '../../interfaces/apps.enum';
import { GoogleContactsOAuthClient } from './google-contacts.oauth';
import {
	GoogleInvalidGrantError,
	IGoogleCredentials,
} from './google-contacts.types';

const REFRESH_MARGIN_MS: number = 60_000;
const APP_ID: AppsEnum.App = AppsEnum.App.GOOGLE_CONTACTS;

/**
 * Gives the other Google services a valid access token for an owner: checks the
 * connection is usable and renews the token when it is about to expire.
 */
@Injectable()
export class GoogleAccessTokenProvider {
	//#region Constructor

	constructor(
		private readonly _connectionsService: AppConnectionsService,
		private readonly _oauthClient: GoogleContactsOAuthClient,
	) {}

	//#endregion

	//#region Public Methods

	public async forOwner(
		ownerUserId: string,
	): Promise<{ connection: IAppConnection; accessToken: string }> {
		const connection: IAppConnection | null =
			await this._connectionsService.findWithCredentials(ownerUserId, APP_ID);

		if (!connection) {
			throw new AppNotConnectedException(APP_ID);
		}

		if (connection.status !== AppsEnum.ConnectionStatus.CONNECTED) {
			throw new AppConnectionExpiredException(APP_ID);
		}

		return { connection, accessToken: await this._freshToken(connection) };
	}

	//#endregion

	//#region Private Methods

	private async _freshToken(connection: IAppConnection): Promise<string> {
		const credentials: IGoogleCredentials =
			this._connectionsService.readCredentials<IGoogleCredentials>(connection);

		const stillValid: boolean =
			!!connection.expiresAt &&
			new Date(connection.expiresAt).getTime() - Date.now() > REFRESH_MARGIN_MS;

		if (stillValid) {
			return credentials.accessToken;
		}

		if (!credentials.refreshToken) {
			await this._expire(connection);
		}

		try {
			const refreshed = await this._oauthClient.refreshAccessToken(
				credentials.refreshToken,
			);

			await this._connectionsService.updateTokens(
				connection._id,
				{ ...credentials, accessToken: refreshed.accessToken },
				refreshed.expiresAt,
			);

			return refreshed.accessToken;
		} catch (error) {
			if (error instanceof GoogleInvalidGrantError) {
				await this._expire(connection);
			}

			throw error;
		}
	}

	private async _expire(connection: IAppConnection): Promise<never> {
		await this._connectionsService.markStatus(
			connection._id,
			AppsEnum.ConnectionStatus.EXPIRED,
		);

		throw new AppConnectionExpiredException(APP_ID);
	}

	//#endregion
}
