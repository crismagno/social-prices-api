import { Injectable } from '@nestjs/common';

import {
	IMessengerUploadFile,
	IMetaPage,
	IMetaProfile,
	MetaApiError,
} from './messenger.types';

const DEFAULT_GRAPH_VERSION: string = 'v23.0';

// Files of a message live on Facebook's CDN. Nothing else is ever fetched for
// a customer's message, whatever address the webhook claims.
const CDN_HOSTS: string[] = ['fbcdn.net', 'fbsbx.com', 'cdninstagram.com'];
const MAX_ATTACHMENT_BYTES: number = 25 * 1024 * 1024;

// What Messenger plays as audio. Anything else is delivered as a file.
const AUDIO_TYPES: string[] = [
	'audio/wav',
	'audio/x-wav',
	'audio/wave',
	'audio/mpeg',
	'audio/mp4',
	'audio/x-m4a',
	'audio/aac',
];
const IMAGE_TYPES: string[] = [
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
];

// What the app asks the user to allow, and what the page webhook is subscribed to.
export const LOGIN_SCOPES: string[] = [
	'pages_show_list',
	'pages_messaging',
	'pages_manage_metadata',
];
// message_echoes: what the Page sent from Messenger or Business Suite shows up here too.
const WEBHOOK_FIELDS: string[] = [
	'messages',
	'messaging_postbacks',
	'message_echoes',
];

// Read on every call: the version moves on its own schedule at Meta.
const version = (): string =>
	process.env.META_GRAPH_VERSION || DEFAULT_GRAPH_VERSION;

const graphUrl = (path: string): string =>
	`https://graph.facebook.com/${version()}${path}`;

/**
 * Talks to Meta's Graph API for the Messenger app. Tokens travel in the
 * Authorization header or the request body, never in a URL, and no error
 * message or log carries one.
 */
@Injectable()
export class MessengerGraphClient {
	//#region Public Methods

	public buildAuthUrl(state: string): string {
		const params: URLSearchParams = new URLSearchParams({
			client_id: process.env.META_APP_ID ?? '',
			redirect_uri: process.env.META_REDIRECT_URI ?? '',
			state,
			response_type: 'code',
			scope: LOGIN_SCOPES.join(','),
		});

		return `https://www.facebook.com/${version()}/dialog/oauth?${params}`;
	}

	/** The short-lived user token for the code Facebook sent back. */
	public async exchangeCode(code: string): Promise<string> {
		const answer: any = await this._call('POST', '/oauth/access_token', {
			form: {
				client_id: process.env.META_APP_ID ?? '',
				client_secret: process.env.META_APP_SECRET ?? '',
				redirect_uri: process.env.META_REDIRECT_URI ?? '',
				code,
			},
		});

		return answer.access_token;
	}

	/** Page tokens made from a long-lived user token do not expire. */
	public async extendToken(userToken: string): Promise<string> {
		const answer: any = await this._call('POST', '/oauth/access_token', {
			form: {
				grant_type: 'fb_exchange_token',
				client_id: process.env.META_APP_ID ?? '',
				client_secret: process.env.META_APP_SECRET ?? '',
				fb_exchange_token: userToken,
			},
		});

		return answer.access_token;
	}

	/** What the user allowed on the Facebook screen; tells why no Page came back. */
	public async getPermissions(
		userToken: string,
	): Promise<{ granted: string[]; declined: string[] }> {
		const answer: any = await this._call('GET', '/me/permissions', {
			token: userToken,
		});

		const named = (status: string): string[] =>
			(answer.data ?? [])
				.filter((entry: any) => entry.status === status)
				.map((entry: any) => entry.permission);

		return { granted: named('granted'), declined: named('declined') };
	}

	public async listPages(userToken: string): Promise<IMetaPage[]> {
		const answer: any = await this._call(
			'GET',
			'/me/accounts?fields=id,name,access_token&limit=100',
			{ token: userToken },
		);

		return (answer.data ?? [])
			.filter((page: any) => page.access_token)
			.map((page: any) => ({
				id: String(page.id),
				name: page.name,
				accessToken: page.access_token,
			}));
	}

	/** Answers a person who wrote in the last 24 hours. */
	public async sendText(
		pageToken: string,
		psid: string,
		text: string,
	): Promise<{ mid: string; sentAt: Date }> {
		const answer: any = await this._call('POST', '/me/messages', {
			token: pageToken,
			json: {
				recipient: { id: psid },
				messaging_type: 'RESPONSE',
				message: { text },
			},
		});

		return { mid: answer.message_id, sentAt: new Date() };
	}

	/** Sends a file to a person who wrote in the last 24 hours, as the kind that suits its type. */
	public async sendAttachment(
		pageToken: string,
		psid: string,
		file: IMessengerUploadFile,
	): Promise<{ mid: string; sentAt: Date; type: string }> {
		const type: string = this._attachmentTypeOf(file.mimeType);

		const form: FormData = new FormData();
		form.append('recipient', JSON.stringify({ id: psid }));
		form.append('messaging_type', 'RESPONSE');
		form.append(
			'message',
			JSON.stringify({ attachment: { type, payload: { is_reusable: false } } }),
		);
		form.append(
			'filedata',
			new Blob([file.buffer], { type: file.mimeType }),
			file.fileName,
		);

		const answer: any = await this._call('POST', '/me/messages', {
			token: pageToken,
			multipart: form,
		});

		return { mid: answer.message_id, sentAt: new Date(), type };
	}

	public async getProfile(
		pageToken: string,
		psid: string,
	): Promise<IMetaProfile> {
		const answer: any = await this._call(
			'GET',
			`/${psid}?fields=first_name,last_name,profile_pic`,
			{ token: pageToken },
		);

		return {
			name:
				[answer.first_name, answer.last_name].filter(Boolean).join(' ') || null,
			profilePic: answer.profile_pic ?? null,
		};
	}

	/**
	 * The name of a person from the Page's conversation with them. Facebook refuses
	 * the profile of some people (error 100, "missing permissions") yet still names
	 * them here.
	 */
	public async getParticipantName(
		pageToken: string,
		pageId: string,
		psid: string,
	): Promise<string | null> {
		const answer: any = await this._call(
			'GET',
			`/${pageId}/conversations?user_id=${encodeURIComponent(
				psid,
			)}&fields=participants&limit=1`,
			{ token: pageToken },
		);

		for (const conversation of answer.data ?? []) {
			const person = (conversation.participants?.data ?? []).find(
				(participant: any) => String(participant.id) === psid,
			);

			if (person?.name) {
				return person.name;
			}
		}

		return null;
	}

	/** The bytes of a file a customer sent. Only Facebook's CDN, only https. */
	public async fetchAttachment(
		url: string,
	): Promise<{ buffer: Buffer; contentType: string }> {
		if (!this._isCdnUrl(url)) {
			throw new MetaApiError(400, null, 'Not a Facebook file address.');
		}

		let response: Response;

		try {
			response = await fetch(url);
		} catch {
			throw new MetaApiError(0, null, 'Could not reach Meta.');
		}

		if (!response.ok) {
			throw new MetaApiError(
				response.status,
				null,
				'The file is not available.',
			);
		}

		const buffer: Buffer = Buffer.from(await response.arrayBuffer());

		if (buffer.length > MAX_ATTACHMENT_BYTES) {
			throw new MetaApiError(413, null, 'The file is too large.');
		}

		return {
			buffer,
			contentType:
				response.headers.get('content-type') ?? 'application/octet-stream',
		};
	}

	public async subscribePage(pageId: string, pageToken: string): Promise<void> {
		await this._call('POST', `/${pageId}/subscribed_apps`, {
			token: pageToken,
			form: { subscribed_fields: WEBHOOK_FIELDS.join(',') },
		});
	}

	public async unsubscribePage(
		pageId: string,
		pageToken: string,
	): Promise<void> {
		await this._call('DELETE', `/${pageId}/subscribed_apps`, {
			token: pageToken,
		});
	}

	//#endregion

	//#region Private Methods

	private _attachmentTypeOf(mimeType: string): string {
		if (IMAGE_TYPES.includes(mimeType)) {
			return 'image';
		}

		if (mimeType === 'video/mp4') {
			return 'video';
		}

		return AUDIO_TYPES.includes(mimeType) ? 'audio' : 'file';
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

	private async _call(
		method: 'GET' | 'POST' | 'DELETE',
		path: string,
		options: {
			token?: string;
			form?: Record<string, string>;
			json?: Record<string, unknown>;
			multipart?: FormData;
		} = {},
	): Promise<any> {
		let response: Response;

		try {
			response = await fetch(graphUrl(path), {
				method,
				headers: {
					...(options.token
						? { Authorization: `Bearer ${options.token}` }
						: {}),
					...(options.form
						? { 'Content-Type': 'application/x-www-form-urlencoded' }
						: {}),
					...(options.json ? { 'Content-Type': 'application/json' } : {}),
				},
				// A form sets its own content type, boundary included.
				body: options.multipart
					? options.multipart
					: options.form
					? new URLSearchParams(options.form)
					: options.json
					? JSON.stringify(options.json)
					: undefined,
			});
		} catch {
			// A network error message can contain the URL, hence a token.
			throw new MetaApiError(0, null, 'Could not reach Meta.');
		}

		let answer: any;

		try {
			answer = await response.json();
		} catch {
			throw new MetaApiError(
				response.status,
				null,
				'Meta sent an answer that is not JSON.',
			);
		}

		if (!response.ok || answer?.error) {
			throw new MetaApiError(
				response.status,
				answer?.error?.code ?? null,
				answer?.error?.message ?? 'Unknown error.',
			);
		}

		return answer;
	}

	//#endregion
}
