import { Injectable } from '@nestjs/common';

import {
	GoogleInvalidGrantError,
	IGoogleTokenResponse,
} from './google-contacts.types';

const AUTH_URL: string = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL: string = 'https://oauth2.googleapis.com/token';
const REVOKE_URL: string = 'https://oauth2.googleapis.com/revoke';
const USERINFO_URL: string = 'https://www.googleapis.com/oauth2/v3/userinfo';

export const GOOGLE_CONTACTS_SCOPES: string[] = [
	'https://www.googleapis.com/auth/contacts.readonly',
	'https://www.googleapis.com/auth/userinfo.email',
];

@Injectable()
export class GoogleContactsOAuthClient {
	//#region Public Methods

	/** `prompt=consent` makes Google return a refresh token on every connect. */
	public buildAuthUrl(state: string): string {
		const params: URLSearchParams = new URLSearchParams({
			client_id: process.env.GOOGLE_CLIENT_ID ?? '',
			redirect_uri: process.env.GOOGLE_REDIRECT_URI ?? '',
			response_type: 'code',
			scope: GOOGLE_CONTACTS_SCOPES.join(' '),
			access_type: 'offline',
			prompt: 'consent',
			state,
		});

		return `${AUTH_URL}?${params.toString()}`;
	}

	public async exchangeCode(code: string): Promise<IGoogleTokenResponse> {
		const body: any = await this._postToken({
			grant_type: 'authorization_code',
			code,
			redirect_uri: process.env.GOOGLE_REDIRECT_URI ?? '',
		});

		return {
			accessToken: body.access_token,
			refreshToken: body.refresh_token ?? null,
			expiresAt: this._expiresAt(body.expires_in),
			scopes: String(body.scope ?? '')
				.split(' ')
				.filter(Boolean),
		};
	}

	public async refreshAccessToken(
		refreshToken: string,
	): Promise<{ accessToken: string; expiresAt: Date }> {
		const body: any = await this._postToken({
			grant_type: 'refresh_token',
			refresh_token: refreshToken,
		});

		return {
			accessToken: body.access_token,
			expiresAt: this._expiresAt(body.expires_in),
		};
	}

	public async fetchAccountEmail(accessToken: string): Promise<string | null> {
		try {
			const response: Response = await fetch(USERINFO_URL, {
				headers: { Authorization: `Bearer ${accessToken}` },
			});

			if (!response.ok) {
				return null;
			}

			return ((await response.json()) as any)?.email ?? null;
		} catch {
			return null;
		}
	}

	/** Best effort: disconnecting locally must not depend on Google being up. */
	public async revoke(token: string): Promise<void> {
		try {
			await fetch(REVOKE_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({ token }).toString(),
			});
		} catch {
			// intentionally ignored
		}
	}

	//#endregion

	//#region Private Methods

	private async _postToken(params: Record<string, string>): Promise<any> {
		const response: Response = await fetch(TOKEN_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				client_id: process.env.GOOGLE_CLIENT_ID ?? '',
				client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
				...params,
			}).toString(),
		});

		const body: any = await response.json();

		if (!response.ok) {
			if (body?.error === 'invalid_grant') {
				throw new GoogleInvalidGrantError();
			}

			throw new Error(`Google token request failed: ${body?.error}`);
		}

		return body;
	}

	private _expiresAt(expiresInSeconds: number): Date {
		return new Date(Date.now() + Number(expiresInSeconds ?? 0) * 1000);
	}

	//#endregion
}
