import { Injectable } from '@nestjs/common';

import {
	IInstagramAccount,
	IInstagramProfile,
	IInstagramToken,
	InstagramApiError,
} from './instagram.types';

const DEFAULT_GRAPH_VERSION: string = 'v23.0';

// What the app asks the user to allow, and what the account webhook is subscribed to.
export const LOGIN_SCOPES: string[] = [
	'instagram_business_basic',
	'instagram_business_manage_messages',
];
const WEBHOOK_FIELDS: string[] = ['messages'];

// Files of a message live on Instagram's CDN. Nothing else is ever fetched for a
// customer's message, whatever address the webhook claims.
const CDN_HOSTS: string[] = ['fbcdn.net', 'fbsbx.com', 'cdninstagram.com'];
const MAX_ATTACHMENT_BYTES: number = 25 * 1024 * 1024;

// Read on every call: the version moves on its own schedule at Meta.
const version = (): string =>
	process.env.INSTAGRAM_GRAPH_VERSION || DEFAULT_GRAPH_VERSION;

const graphUrl = (path: string): string =>
	`https://graph.instagram.com/${version()}${path}`;

const asPermissions = (raw: unknown): string[] =>
	Array.isArray(raw)
		? raw.map(String)
		: typeof raw === 'string'
		? raw.split(',').filter(Boolean)
		: [];

/**
 * Talks to Instagram's API for the Instagram app (the one that logs in with
 * Instagram itself). Tokens travel in the Authorization header or the request
 * body wherever Instagram allows it, and no error message or log carries one.
 */
@Injectable()
export class InstagramGraphClient {
	//#region Public Methods

	public buildAuthUrl(state: string): string {
		const params: URLSearchParams = new URLSearchParams({
			client_id: process.env.INSTAGRAM_APP_ID ?? '',
			redirect_uri: process.env.INSTAGRAM_REDIRECT_URI ?? '',
			state,
			response_type: 'code',
			scope: LOGIN_SCOPES.join(','),
		});

		return `https://www.instagram.com/oauth/authorize?${params}`;
	}

	/** The short-lived token (about an hour) for the code Instagram sent back. */
	public async exchangeCode(
		code: string,
	): Promise<{ accessToken: string; permissions: string[] }> {
		const answer: any = await this._request(
			'https://api.instagram.com/oauth/access_token',
			{
				method: 'POST',
				form: {
					client_id: process.env.INSTAGRAM_APP_ID ?? '',
					client_secret: process.env.INSTAGRAM_APP_SECRET ?? '',
					grant_type: 'authorization_code',
					redirect_uri: process.env.INSTAGRAM_REDIRECT_URI ?? '',
					code,
				},
			},
		);

		// The answer is either the token itself or a list holding it.
		const result: any = answer.data?.[0] ?? answer;

		return {
			accessToken: result.access_token,
			permissions: asPermissions(result.permissions),
		};
	}

	/** The long-lived token: it lasts 60 days and can be renewed. */
	public async extendToken(shortToken: string): Promise<IInstagramToken> {
		return this._toToken(
			await this._request(
				`https://graph.instagram.com/access_token?${new URLSearchParams({
					grant_type: 'ig_exchange_token',
					client_secret: process.env.INSTAGRAM_APP_SECRET ?? '',
					access_token: shortToken,
				})}`,
			),
		);
	}

	/** Another 60 days. Instagram only renews a token that is at least a day old and has not expired. */
	public async refreshToken(longToken: string): Promise<IInstagramToken> {
		return this._toToken(
			await this._request(
				`https://graph.instagram.com/refresh_access_token?${new URLSearchParams(
					{
						grant_type: 'ig_refresh_token',
						access_token: longToken,
					},
				)}`,
			),
		);
	}

	public async getAccount(token: string): Promise<IInstagramAccount> {
		const answer: any = await this._request(
			graphUrl(
				'/me?fields=user_id,username,name,profile_picture_url,account_type',
			),
			{ token },
		);

		return {
			userId: String(answer.user_id ?? answer.id),
			username: answer.username,
			name: answer.name ?? null,
			profilePictureUrl: answer.profile_picture_url ?? null,
			accountType: answer.account_type,
		};
	}

	public async subscribeAccount(
		accountId: string,
		token: string,
	): Promise<void> {
		await this._request(graphUrl(`/${accountId}/subscribed_apps`), {
			method: 'POST',
			token,
			form: { subscribed_fields: WEBHOOK_FIELDS.join(',') },
		});
	}

	public async unsubscribeAccount(
		accountId: string,
		token: string,
	): Promise<void> {
		await this._request(graphUrl(`/${accountId}/subscribed_apps`), {
			method: 'DELETE',
			token,
		});
	}

	/** Answers a person who wrote in the last 24 hours. */
	public async sendText(
		token: string,
		accountId: string,
		igsid: string,
		text: string,
	): Promise<{ mid: string; sentAt: Date }> {
		const answer: any = await this._request(
			graphUrl(`/${accountId}/messages`),
			{
				method: 'POST',
				token,
				json: { recipient: { id: igsid }, message: { text } },
			},
		);

		return { mid: answer.message_id, sentAt: new Date() };
	}

	public async getProfile(
		token: string,
		igsid: string,
	): Promise<IInstagramProfile> {
		const answer: any = await this._request(
			graphUrl(`/${igsid}?fields=name,username,profile_pic`),
			{ token },
		);

		return {
			name: answer.name ?? null,
			username: answer.username ?? null,
			profilePic: answer.profile_pic ?? null,
		};
	}

	/** The bytes of a file a customer sent. Only Instagram's CDN, only https. */
	public async fetchAttachment(
		url: string,
	): Promise<{ buffer: Buffer; contentType: string }> {
		if (!this._isCdnUrl(url)) {
			throw new InstagramApiError(400, null, 'Not an Instagram file address.');
		}

		let response: Response;

		try {
			response = await fetch(url);
		} catch {
			throw new InstagramApiError(0, null, 'Could not reach Instagram.');
		}

		if (!response.ok) {
			throw new InstagramApiError(
				response.status,
				null,
				'The file is not available.',
			);
		}

		const buffer: Buffer = Buffer.from(await response.arrayBuffer());

		if (buffer.length > MAX_ATTACHMENT_BYTES) {
			throw new InstagramApiError(413, null, 'The file is too large.');
		}

		return {
			buffer,
			contentType:
				response.headers.get('content-type') ?? 'application/octet-stream',
		};
	}

	//#endregion

	//#region Private Methods

	private _toToken(answer: any): IInstagramToken {
		return {
			accessToken: answer.access_token,
			expiresAt: new Date(Date.now() + Number(answer.expires_in) * 1000),
		};
	}

	private _isCdnUrl(url: string): boolean {
		let parsed: URL;

		try {
			parsed = new URL(url);
		} catch {
			return false;
		}

		return (
			parsed.protocol === 'https:' &&
			CDN_HOSTS.some(
				(host: string) =>
					parsed.hostname === host || parsed.hostname.endsWith(`.${host}`),
			)
		);
	}

	private async _request(
		url: string,
		options: {
			method?: 'GET' | 'POST' | 'DELETE';
			token?: string;
			form?: Record<string, string>;
			json?: Record<string, unknown>;
		} = {},
	): Promise<any> {
		let response: Response;

		try {
			response = await fetch(url, {
				method: options.method ?? 'GET',
				headers: {
					...(options.token
						? { Authorization: `Bearer ${options.token}` }
						: {}),
					...(options.form
						? { 'Content-Type': 'application/x-www-form-urlencoded' }
						: {}),
					...(options.json ? { 'Content-Type': 'application/json' } : {}),
				},
				body: options.form
					? new URLSearchParams(options.form)
					: options.json
					? JSON.stringify(options.json)
					: undefined,
			});
		} catch {
			// A network error message can contain the URL, hence a token.
			throw new InstagramApiError(0, null, 'Could not reach Instagram.');
		}

		let answer: any;

		try {
			answer = await response.json();
		} catch {
			throw new InstagramApiError(
				response.status,
				null,
				'Instagram sent an answer that is not JSON.',
			);
		}

		if (!response.ok || answer?.error || answer?.error_message) {
			// The login endpoint answers in its own shape, the rest in `error`.
			throw new InstagramApiError(
				response.status,
				answer?.error?.code ?? answer?.code ?? null,
				answer?.error?.message ?? answer?.error_message ?? 'Unknown error.',
			);
		}

		return answer;
	}

	//#endregion
}
