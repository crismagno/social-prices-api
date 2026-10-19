import { Injectable } from '@nestjs/common';

import {
	ITelegramBotInfo,
	ITelegramDownloadedFile,
	ITelegramSentMessage,
	ITelegramUploadFile,
	ITelegramWebhookInfo,
	TelegramApiError,
} from './telegram.types';
import { contentTypeOf, extractTelegramMedia } from './telegram.update-parser';

const DEFAULT_API_URL: string = 'https://api.telegram.org';

// Telegram shows a photo only up to 10 MB and only as one of these types; anything
// else is still delivered, as a file.
const MAX_PHOTO_BYTES: number = 10 * 1024 * 1024;
const PHOTO_TYPES: string[] = ['image/jpeg', 'image/png', 'image/webp'];
// What Telegram takes as a voice message besides OGG/Opus.
const VOICE_TYPES: string[] = ['audio/mpeg', 'audio/ogg', 'audio/mp4'];
const AUDIO_TYPES: string[] = ['audio/mpeg', 'audio/mp4', 'audio/x-m4a'];

interface IUploadKind {
	method: string;
	field: string;
}

// Read on every call so it can point at a local Bot API server, or a fake one in tests.
const apiUrl = (): string =>
	(process.env.TELEGRAM_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');

/**
 * Talks to the Telegram Bot API for one bot, identified by its token. The token
 * is part of every request URL, so URLs and the errors of a failed request are
 * never put in a message or a log.
 */
@Injectable()
export class TelegramBotClient {
	//#region Public Methods

	public async getMe(token: string): Promise<ITelegramBotInfo> {
		const bot: any = await this._call(token, 'getMe');

		return { id: bot.id, username: bot.username, firstName: bot.first_name };
	}

	/** Only plain messages are asked for: nothing else is used yet. */
	public async setWebhook(
		token: string,
		url: string,
		secretToken: string,
	): Promise<void> {
		await this._call(token, 'setWebhook', {
			url,
			secret_token: secretToken,
			allowed_updates: ['message'],
			drop_pending_updates: false,
		});
	}

	/** Sends a plain text message to a chat that already wrote to the bot. */
	public async sendMessage(
		token: string,
		chatId: number,
		text: string,
	): Promise<{ messageId: number; sentAt: Date }> {
		const sent: any = await this._call(token, 'sendMessage', {
			chat_id: chatId,
			text,
		});

		return { messageId: sent.message_id, sentAt: new Date(sent.date * 1000) };
	}

	/** Sends a file, as the kind of message that suits its type. */
	public async sendMedia(
		token: string,
		chatId: number,
		file: ITelegramUploadFile,
		caption: string | null,
		asVoice: boolean = false,
	): Promise<ITelegramSentMessage> {
		const kind: IUploadKind =
			asVoice && VOICE_TYPES.includes(file.mimeType)
				? { method: 'sendVoice', field: 'voice' }
				: this._uploadKindOf(file);

		const form: FormData = new FormData();
		form.append('chat_id', String(chatId));
		form.append(
			kind.field,
			new Blob([file.buffer], { type: file.mimeType }),
			file.fileName,
		);

		if (caption) {
			form.append('caption', caption);
		}

		const sent: any = await this._call(token, kind.method, form);

		return {
			messageId: sent.message_id,
			sentAt: new Date(sent.date * 1000),
			contentType: contentTypeOf(sent),
			media: extractTelegramMedia(sent),
		};
	}

	/** Removes a message for both sides. Telegram allows it for the last 48 hours. */
	public async deleteMessage(
		token: string,
		chatId: number,
		messageId: number,
	): Promise<void> {
		await this._call(token, 'deleteMessage', {
			chat_id: chatId,
			message_id: messageId,
		});
	}

	/** Bots can fetch files up to 20 MB, which is also what this app accepts to send. */
	public async downloadFile(
		token: string,
		fileId: string,
	): Promise<ITelegramDownloadedFile> {
		const info: any = await this._call(token, 'getFile', { file_id: fileId });

		let response: Response;

		try {
			response = await fetch(`${apiUrl()}/file/bot${token}/${info.file_path}`);
		} catch {
			throw new TelegramApiError(0, 'Could not reach Telegram.');
		}

		if (!response.ok) {
			throw new TelegramApiError(response.status, 'Telegram has no such file.');
		}

		return {
			buffer: Buffer.from(await response.arrayBuffer()),
			filePath: info.file_path,
		};
	}

	public async deleteWebhook(token: string): Promise<void> {
		await this._call(token, 'deleteWebhook');
	}

	public async getWebhookInfo(token: string): Promise<ITelegramWebhookInfo> {
		const info: any = await this._call(token, 'getWebhookInfo');

		return {
			url: info.url ?? '',
			pendingUpdateCount: info.pending_update_count ?? 0,
			lastErrorMessage: info.last_error_message ?? null,
			lastErrorDate: info.last_error_date
				? new Date(info.last_error_date * 1000)
				: null,
			lastSynchronizationErrorDate: info.last_synchronization_error_date
				? new Date(info.last_synchronization_error_date * 1000)
				: null,
			hasCustomCertificate: info.has_custom_certificate ?? false,
			ipAddress: info.ip_address ?? null,
			maxConnections: info.max_connections ?? null,
			allowedUpdates: info.allowed_updates ?? [],
		};
	}

	//#endregion

	//#region Private Methods

	private _uploadKindOf(file: ITelegramUploadFile): IUploadKind {
		if (
			PHOTO_TYPES.includes(file.mimeType) &&
			file.buffer.length <= MAX_PHOTO_BYTES
		) {
			return { method: 'sendPhoto', field: 'photo' };
		}

		if (file.mimeType === 'video/mp4') {
			return { method: 'sendVideo', field: 'video' };
		}

		if (AUDIO_TYPES.includes(file.mimeType)) {
			return { method: 'sendAudio', field: 'audio' };
		}

		return { method: 'sendDocument', field: 'document' };
	}

	private async _call(
		token: string,
		method: string,
		body?: Record<string, unknown> | FormData,
	): Promise<any> {
		const payload: FormData | string | undefined =
			body instanceof FormData ? body : body ? JSON.stringify(body) : undefined;

		let response: Response;

		try {
			response = await fetch(`${apiUrl()}/bot${token}/${method}`, {
				method: body ? 'POST' : 'GET',
				// A form sets its own content type, boundary included.
				headers:
					body && !(body instanceof FormData)
						? { 'Content-Type': 'application/json' }
						: undefined,
				body: payload,
			});
		} catch {
			// A network error message can contain the URL, hence the token.
			throw new TelegramApiError(0, 'Could not reach Telegram.');
		}

		let answer: any;

		try {
			answer = await response.json();
		} catch {
			throw new TelegramApiError(
				response.status,
				'Telegram sent an answer that is not JSON.',
			);
		}

		if (!response.ok || !answer?.ok) {
			throw new TelegramApiError(
				answer?.error_code ?? response.status,
				answer?.description ?? 'Unknown error.',
			);
		}

		return answer.result;
	}

	//#endregion
}
