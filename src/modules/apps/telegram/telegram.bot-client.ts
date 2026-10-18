import { Injectable } from '@nestjs/common';

import {
	ITelegramBotInfo,
	ITelegramWebhookInfo,
	TelegramApiError,
} from './telegram.types';

const DEFAULT_API_URL: string = 'https://api.telegram.org';

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

	private async _call(
		token: string,
		method: string,
		body?: Record<string, unknown>,
	): Promise<any> {
		let response: Response;

		try {
			response = await fetch(`${apiUrl()}/bot${token}/${method}`, {
				method: body ? 'POST' : 'GET',
				headers: body ? { 'Content-Type': 'application/json' } : undefined,
				body: body ? JSON.stringify(body) : undefined,
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
