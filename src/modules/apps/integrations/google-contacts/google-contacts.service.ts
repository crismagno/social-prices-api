import { Injectable } from '@nestjs/common';

import { IUser } from '../../../users/interfaces/user.interface';
import { UsersService } from '../../../users/users.service';
import { AppProviderAccessDeniedException } from '../../apps.exceptions';
import { AppConnectionsService } from '../../connections/app-connections.service';
import { IAppConnection } from '../../interfaces/app-connection.interface';
import AppsEnum from '../../interfaces/apps.enum';
import {
	IAppContext,
	IAppImportResult,
	IAppIntegration,
	IAppSyncPreview,
} from '../../interfaces/apps.types';
import {
	AppOAuthStateService,
	IAppOAuthState,
} from '../../oauth/app-oauth-state.service';
import { GoogleContactsImportService } from './google-contacts-import.service';
import { GoogleContactsPreviewService } from './google-contacts-preview.service';
import {
	GOOGLE_CONTACTS_SCOPES,
	GoogleContactsOAuthClient,
} from './google-contacts.oauth';
import {
	GooglePeopleApiError,
	IGoogleCredentials,
	IGoogleTokenResponse,
} from './google-contacts.types';

@Injectable()
export class GoogleContactsService implements IAppIntegration {
	public readonly appId: AppsEnum.App = AppsEnum.App.GOOGLE_CONTACTS;

	//#region Constructor

	constructor(
		private readonly _oauthClient: GoogleContactsOAuthClient,
		private readonly _stateService: AppOAuthStateService,
		private readonly _connectionsService: AppConnectionsService,
		private readonly _previewService: GoogleContactsPreviewService,
		private readonly _importService: GoogleContactsImportService,
		private readonly _usersService: UsersService,
	) {}

	//#endregion

	//#region Public Methods

	public async getConnectUrl(ctx: IAppContext): Promise<string> {
		const state: string = await this._stateService.sign({
			ownerUserId: ctx.ownerUserId,
			employeeId: ctx.employeeId,
			appId: this.appId,
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

		let state: IAppOAuthState;

		try {
			state = await this._stateService.verify(params.state, this.appId);
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

			await this._connectionsService.upsert({
				ownerUserId: state.ownerUserId,
				appId: this.appId,
				accountLabel: await this._oauthClient.fetchAccountEmail(
					tokens.accessToken,
				),
				credentials: {
					accessToken: tokens.accessToken,
					refreshToken: tokens.refreshToken,
				},
				scopes: tokens.scopes,
				expiresAt: tokens.expiresAt,
			});

			return this._redirect();
		} catch {
			return this._redirect('connection_failed');
		}
	}

	public async disconnect(ctx: IAppContext): Promise<void> {
		const connection: IAppConnection | null =
			await this._connectionsService.findWithCredentials(
				ctx.ownerUserId,
				this.appId,
			);

		if (connection) {
			try {
				const credentials: IGoogleCredentials =
					this._connectionsService.readCredentials<IGoogleCredentials>(
						connection,
					);

				await this._oauthClient.revoke(
					credentials.refreshToken ?? credentials.accessToken,
				);
			} catch {
				// unreadable credentials must not stop the user from disconnecting
			}
		}

		await this._connectionsService.deleteByOwnerAndApp(
			ctx.ownerUserId,
			this.appId,
		);
	}

	public async sync(ctx: IAppContext): Promise<IAppSyncPreview> {
		return await this._withProviderErrors(() =>
			this._previewService.preview(ctx.ownerUserId),
		);
	}

	public async importSelected(
		ctx: IAppContext,
		externalIds: string[],
	): Promise<IAppImportResult> {
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
				throw new AppProviderAccessDeniedException(this.appId, error.reason);
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
