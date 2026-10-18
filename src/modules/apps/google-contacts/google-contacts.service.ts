import { Injectable } from '@nestjs/common';

import { IUser } from '../../users/interfaces/user.interface';
import { UsersService } from '../../users/users.service';
import AppsEnum from '../interfaces/apps.enum';
import { IAppContext } from '../interfaces/apps.types';
import { IGoogleContactsConnection } from './google-contacts-connection.interface';
import { GoogleContactsConnectionsService } from './google-contacts-connections.service';
import { GoogleContactsImportService } from './google-contacts-import.service';
import { GoogleContactsPreviewService } from './google-contacts-preview.service';
import { GoogleContactsAccessDeniedException } from './google-contacts.exceptions';
import {
	GoogleContactsOAuthState,
	IGoogleContactsOAuthState,
} from './google-contacts.oauth-state';
import {
	GOOGLE_CONTACTS_SCOPES,
	GoogleContactsOAuthClient,
} from './google-contacts.oauth';
import {
	GooglePeopleApiError,
	IGoogleContactsImportResponse,
	IGoogleContactsPreview,
	IGoogleTokens,
	IGoogleTokenResponse,
} from './google-contacts.types';

@Injectable()
export class GoogleContactsService {
	public readonly appId: AppsEnum.App = AppsEnum.App.GOOGLE_CONTACTS;

	//#region Constructor

	constructor(
		private readonly _oauthClient: GoogleContactsOAuthClient,
		private readonly _oauthState: GoogleContactsOAuthState,
		private readonly _connectionsService: GoogleContactsConnectionsService,
		private readonly _previewService: GoogleContactsPreviewService,
		private readonly _importService: GoogleContactsImportService,
		private readonly _usersService: UsersService,
	) {}

	//#endregion

	//#region Public Methods

	public async getConnectUrl(ctx: IAppContext): Promise<string> {
		const state: string = await this._oauthState.sign({
			ownerUserId: ctx.ownerUserId,
			employeeId: ctx.employeeId,
		});

		return this._oauthClient.buildAuthUrl(state);
	}

	/**
	 * Runs on the public callback, so it never throws: every failure becomes a
	 * redirect to the app page carrying a short error code the client translates.
	 */
	public async handleCallback(
		params: Record<string, string>,
	): Promise<{ redirectTo: string }> {
		if (params.error) {
			return this._redirect(
				params.error === 'access_denied' ? 'access_denied' : 'oauth_error',
			);
		}

		let state: IGoogleContactsOAuthState;

		try {
			state = await this._oauthState.verify(params.state);
		} catch {
			return this._redirect('invalid_state');
		}

		if (!params.code) {
			return this._redirect('missing_code');
		}

		try {
			const user: IUser | undefined = await this._usersService.findOneById(
				state.ownerUserId,
			);

			if (!user?.enabledApps?.includes(this.appId)) {
				return this._redirect('not_enabled');
			}

			const tokens: IGoogleTokenResponse = await this._oauthClient.exchangeCode(
				params.code,
			);

			if (!tokens.refreshToken) {
				return this._redirect('no_refresh_token');
			}

			// Google lets the user untick individual permissions on the consent
			// screen; without contacts access every later sync would fail with 403.
			if (!tokens.scopes.includes(GOOGLE_CONTACTS_SCOPES[0])) {
				return this._redirect('missing_scope');
			}

			await this._connectionsService.saveConnection({
				ownerUserId: state.ownerUserId,
				googleEmail: await this._oauthClient.fetchAccountEmail(
					tokens.accessToken,
				),
				tokens: {
					accessToken: tokens.accessToken,
					refreshToken: tokens.refreshToken,
				},
				grantedScopes: tokens.scopes,
				accessTokenExpiresAt: tokens.expiresAt,
			});

			return this._redirect();
		} catch {
			return this._redirect('connection_failed');
		}
	}

	public async disconnect(ctx: IAppContext): Promise<void> {
		const connection: IGoogleContactsConnection | null =
			await this._connectionsService.findWithTokens(ctx.ownerUserId);

		if (connection) {
			try {
				const stored: IGoogleTokens =
					this._connectionsService.readTokens(connection);

				await this._oauthClient.revoke(
					stored.refreshToken ?? stored.accessToken,
				);
			} catch {
				// unreadable tokens must not stop the user from disconnecting
			}
		}

		await this._connectionsService.deleteByOwner(ctx.ownerUserId);
	}

	public async listContacts(ctx: IAppContext): Promise<IGoogleContactsPreview> {
		return await this._withProviderErrors(() =>
			this._previewService.preview(ctx.ownerUserId),
		);
	}

	public async importSelected(
		ctx: IAppContext,
		externalIds: string[],
	): Promise<IGoogleContactsImportResponse> {
		return await this._withProviderErrors(() =>
			this._importService.importSelected(ctx.ownerUserId, externalIds),
		);
	}

	//#endregion

	//#region Private Methods

	/** A 403 from Google is a setup problem (API off, permission missing); say so. */
	private async _withProviderErrors<T>(call: () => Promise<T>): Promise<T> {
		try {
			return await call();
		} catch (error) {
			if (error instanceof GooglePeopleApiError && error.status === 403) {
				throw new GoogleContactsAccessDeniedException(error.reason);
			}

			throw error;
		}
	}

	/** Targets are built server-side from SOCIAL_PRICES_URL: no open redirect. */
	private _redirect(errorCode?: string): { redirectTo: string } {
		const base: string = (process.env.SOCIAL_PRICES_URL ?? '').replace(
			/\/+$/,
			'',
		);
		const path: string = `${base}/apps/google-contacts`;

		return { redirectTo: errorCode ? `${path}?error=${errorCode}` : path };
	}

	//#endregion
}
