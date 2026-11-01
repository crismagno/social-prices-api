import { Injectable } from '@nestjs/common';

import {
	IWhatsappNumber,
	IWhatsappUploadFile,
	WhatsappApiError,
} from './whatsapp.types';

const DEFAULT_GRAPH_VERSION: string = 'v23.0';

// What the webhook of a business account is subscribed to.
const MAX_MEDIA_BYTES: number = 25 * 1024 * 1024;

// Read on every call: the version moves on its own schedule at Meta.
export const graphVersion = (): string =>
	process.env.WHATSAPP_GRAPH_VERSION || DEFAULT_GRAPH_VERSION;

const graphUrl = (path: string): string =>
	`https://graph.facebook.com/${graphVersion()}${path}`;

/** How WhatsApp names the kind of message a file is sent as. */
export type WhatsappMediaType = 'image' | 'video' | 'audio' | 'document';

/**
 * Talks to the WhatsApp Business Platform (Cloud API). Tokens travel in the
 * Authorization header or the request body, and no error message or log carries one.
 */
@Injectable()
export class WhatsappGraphClient {
	//#region Connecting

	/** The business token for the code Embedded Signup gave the browser. */
	public async exchangeCode(code: string): Promise<string> {
		const answer: any = await this._request(
			graphUrl(
				`/oauth/access_token?${new URLSearchParams({
					client_id: process.env.WHATSAPP_APP_ID ?? '',
					client_secret: process.env.WHATSAPP_APP_SECRET ?? '',
					code,
				})}`,
			),
		);

		return answer.access_token;
	}

	public async getNumber(
		token: string,
		phoneNumberId: string,
	): Promise<IWhatsappNumber> {
		const answer: any = await this._request(
			graphUrl(`/${phoneNumberId}?fields=display_phone_number,verified_name`),
			{ token },
		);

		return {
			displayPhoneNumber: answer.display_phone_number ?? phoneNumberId,
			verifiedName: answer.verified_name ?? null,
		};
	}

	/** Lets this app receive the messages of the business account. */
	public async subscribeApp(wabaId: string, token: string): Promise<void> {
		await this._request(graphUrl(`/${wabaId}/subscribed_apps`), {
			method: 'POST',
			token,
		});
	}

	public async unsubscribeApp(wabaId: string, token: string): Promise<void> {
		await this._request(graphUrl(`/${wabaId}/subscribed_apps`), {
			method: 'DELETE',
			token,
		});
	}

	/** Turns the number on for the Cloud API. The PIN is its two-step verification code. */
	public async registerNumber(
		phoneNumberId: string,
		token: string,
		pin: string,
	): Promise<void> {
		await this._request(graphUrl(`/${phoneNumberId}/register`), {
			method: 'POST',
			token,
			json: { messaging_product: 'whatsapp', pin },
		});
	}

	//#endregion

	//#region Sending

	public async sendText(
		token: string,
		phoneNumberId: string,
		to: string,
		text: string,
	): Promise<{ mid: string; sentAt: Date }> {
		return await this._send(token, phoneNumberId, {
			to,
			type: 'text',
			text: { body: text, preview_url: false },
		});
	}

	/**
	 * Uploads a file and sends it as the kind of message that suits its type. A
	 * caption goes with images, videos and documents; an audio has none.
	 */
	public async sendMedia(
		token: string,
		phoneNumberId: string,
		to: string,
		file: IWhatsappUploadFile,
		caption: string | null,
	): Promise<{
		mid: string;
		sentAt: Date;
		mediaId: string;
		type: WhatsappMediaType;
	}> {
		const type: WhatsappMediaType = this.mediaTypeOf(file.mimeType);

		const form: FormData = new FormData();
		form.append('messaging_product', 'whatsapp');
		form.append('type', file.mimeType);
		form.append(
			'file',
			new Blob([file.buffer], { type: file.mimeType }),
			file.fileName,
		);

		const uploaded: any = await this._request(
			graphUrl(`/${phoneNumberId}/media`),
			{
				method: 'POST',
				token,
				multipart: form,
			},
		);

		const mediaId: string = uploaded.id;

		const sent = await this._send(token, phoneNumberId, {
			to,
			type,
			[type]: {
				id: mediaId,
				...(caption && type !== 'audio' ? { caption } : {}),
				...(type === 'document' ? { filename: file.fileName } : {}),
			},
		});

		return { ...sent, mediaId, type };
	}

	/** WhatsApp takes a few picture and audio formats as such; anything else goes as a document. */
	public mediaTypeOf(mimeType: string): WhatsappMediaType {
		const base: string = mimeType.split(';')[0].trim().toLowerCase();

		if (['image/jpeg', 'image/png'].includes(base)) {
			return 'image';
		}

		if (['video/mp4', 'video/3gpp'].includes(base)) {
			return 'video';
		}

		if (
			[
				'audio/aac',
				'audio/mp4',
				'audio/mpeg',
				'audio/amr',
				'audio/ogg',
			].includes(base)
		) {
			return 'audio';
		}

		return 'document';
	}

	//#endregion

	//#region Receiving files

	/** The address and type of a file a customer sent; the address expires in minutes. */
	public async getMedia(
		token: string,
		mediaId: string,
	): Promise<{ url: string; mimeType: string | null }> {
		const answer: any = await this._request(graphUrl(`/${mediaId}`), { token });

		return { url: answer.url, mimeType: answer.mime_type ?? null };
	}

	/** The bytes of a file, from WhatsApp's own hosts only, with the token WhatsApp asks for. */
	public async downloadMedia(
		token: string,
		url: string,
	): Promise<{ buffer: Buffer; contentType: string }> {
		if (!this._isMetaUrl(url)) {
			throw new WhatsappApiError(400, null, 'Not a WhatsApp file address.');
		}

		let response: Response;

		try {
			response = await fetch(url, {
				headers: { Authorization: `Bearer ${token}` },
			});
		} catch {
			throw new WhatsappApiError(0, null, 'Could not reach WhatsApp.');
		}

		if (!response.ok) {
			throw new WhatsappApiError(
				response.status,
				null,
				'The file is not available.',
			);
		}

		const buffer: Buffer = Buffer.from(await response.arrayBuffer());

		if (buffer.length > MAX_MEDIA_BYTES) {
			throw new WhatsappApiError(413, null, 'The file is too large.');
		}

		return {
			buffer,
			contentType:
				response.headers.get('content-type') ?? 'application/octet-stream',
		};
	}

	//#endregion

	//#region Private Methods

	private async _send(
		token: string,
		phoneNumberId: string,
		message: Record<string, unknown>,
	): Promise<{ mid: string; sentAt: Date }> {
		const answer: any = await this._request(
			graphUrl(`/${phoneNumberId}/messages`),
			{
				method: 'POST',
				token,
				json: {
					messaging_product: 'whatsapp',
					recipient_type: 'individual',
					...message,
				},
			},
		);

		return { mid: answer.messages?.[0]?.id, sentAt: new Date() };
	}

	private _isMetaUrl(url: string): boolean {
		let parsed: URL;

		try {
			parsed = new URL(url);
		} catch {
			return false;
		}

		return (
			parsed.protocol === 'https:' &&
			['fbsbx.com', 'whatsapp.net', 'facebook.com', 'fbcdn.net'].some(
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
			json?: Record<string, unknown>;
			multipart?: FormData;
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
					...(options.json ? { 'Content-Type': 'application/json' } : {}),
				},
				body: options.multipart
					? options.multipart
					: options.json
					? JSON.stringify(options.json)
					: undefined,
			});
		} catch {
			// A network error message can contain the URL, hence a token.
			throw new WhatsappApiError(0, null, 'Could not reach WhatsApp.');
		}

		let answer: any;

		try {
			answer = await response.json();
		} catch {
			throw new WhatsappApiError(
				response.status,
				null,
				'WhatsApp sent an answer that is not JSON.',
			);
		}

		if (!response.ok || answer?.error) {
			throw new WhatsappApiError(
				response.status,
				answer?.error?.code ?? null,
				answer?.error?.error_data?.details ??
					answer?.error?.message ??
					'Unknown error.',
			);
		}

		return answer;
	}

	//#endregion
}
