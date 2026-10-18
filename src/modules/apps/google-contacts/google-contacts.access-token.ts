import { Injectable } from '@nestjs/common';

import AppsEnum from '../interfaces/apps.enum';
import { IGoogleContactsConnection } from './google-contacts-connection.interface';
import { GoogleContactsConnectionsService } from './google-contacts-connections.service';
import {
	GoogleContactsConnectionExpiredException,
	GoogleContactsNotConnectedException,
} from './google-contacts.exceptions';
import { GoogleContactsOAuthClient } from './google-contacts.oauth';
import {
	GoogleInvalidGrantError,
	IGoogleTokens,
} from './google-contacts.types';

const REFRESH_MARGIN_MS: number = 60_000;

/**
 * Gives the other Google services a valid access token for an owner: checks the
 * connection is usable and renews the token when it is about to expire.
 */
@Injectable()
export class GoogleAccessTokenProvider {
	//#region Constructor

	constructor(
		private readonly _connectionsService: GoogleContactsConnectionsService,
		private readonly _oauthClient: GoogleContactsOAuthClient,
	) {}

	//#endregion

	//#region Public Methods

	public async forOwner(
		ownerUserId: string,
	): Promise<{ connection: IGoogleContactsConnection; accessToken: string }> {
		const connection: IGoogleContactsConnection | null =
			await this._connectionsService.findWithTokens(ownerUserId);

		if (!connection) {
			throw new GoogleContactsNotConnectedException();
		}

		if (connection.status !== AppsEnum.ConnectionStatus.CONNECTED) {
			throw new GoogleContactsConnectionExpiredException();
		}

		return { connection, accessToken: await this._freshToken(connection) };
	}

	//#endregion

	//#region Private Methods

	private async _freshToken(
		connection: IGoogleContactsConnection,
	): Promise<string> {
		const tokens: IGoogleTokens =
			this._connectionsService.readTokens(connection);

		const stillValid: boolean =
			!!connection.accessTokenExpiresAt &&
			new Date(connection.accessTokenExpiresAt).getTime() - Date.now() >
				REFRESH_MARGIN_MS;

		if (stillValid) {
			return tokens.accessToken;
		}

		if (!tokens.refreshToken) {
			await this._expire(connection);
		}

		try {
			const refreshed = await this._oauthClient.refreshAccessToken(
				tokens.refreshToken,
			);

			await this._connectionsService.updateAccessToken(
				connection._id,
				{ ...tokens, accessToken: refreshed.accessToken },
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

	private async _expire(connection: IGoogleContactsConnection): Promise<never> {
		await this._connectionsService.markStatus(
			connection._id,
			AppsEnum.ConnectionStatus.EXPIRED,
		);

		throw new GoogleContactsConnectionExpiredException();
	}

	//#endregion
}
