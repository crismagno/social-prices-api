import { TelegramBotClient } from './telegram.bot-client';
import { TelegramApiError } from './telegram.types';

const TOKEN = '123456789:AAHsecret_token_value_that_must_not_leak';

const ok = (result: any): any => ({
	ok: true,
	status: 200,
	json: async () => ({ ok: true, result }),
});

const fail = (status: number, description: string): any => ({
	ok: false,
	status,
	json: async () => ({ ok: false, error_code: status, description }),
});

describe('TelegramBotClient', () => {
	const client = new TelegramBotClient();
	const fetchMock = jest.fn();

	beforeEach(() => {
		fetchMock.mockReset();
		(global as any).fetch = fetchMock;
	});

	it('talks to api.telegram.org unless TELEGRAM_API_URL says otherwise', async () => {
		fetchMock.mockResolvedValue(
			ok({ id: 1, username: 'b_bot', first_name: 'B' }),
		);
		const saved = process.env.TELEGRAM_API_URL;

		try {
			delete process.env.TELEGRAM_API_URL;
			await client.getMe(TOKEN);
			expect(fetchMock.mock.calls[0][0]).toBe(
				`https://api.telegram.org/bot${TOKEN}/getMe`,
			);

			process.env.TELEGRAM_API_URL = 'http://localhost:8088/';
			await client.getMe(TOKEN);
			expect(fetchMock.mock.calls[1][0]).toBe(
				`http://localhost:8088/bot${TOKEN}/getMe`,
			);
		} finally {
			if (saved === undefined) delete process.env.TELEGRAM_API_URL;
			else process.env.TELEGRAM_API_URL = saved;
		}
	});

	it('getMe returns the bot identity', async () => {
		fetchMock.mockResolvedValue(
			ok({
				id: 123456789,
				is_bot: true,
				first_name: 'Loja',
				username: 'loja_bot',
			}),
		);

		await expect(client.getMe(TOKEN)).resolves.toEqual({
			id: 123456789,
			username: 'loja_bot',
			firstName: 'Loja',
		});

		expect(fetchMock.mock.calls[0][0]).toBe(
			`https://api.telegram.org/bot${TOKEN}/getMe`,
		);
	});

	it('setWebhook sends the url, the secret and only the message updates', async () => {
		fetchMock.mockResolvedValue(ok(true));

		await client.setWebhook(TOKEN, 'https://x.example/hook', 'secret-1');

		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe(`https://api.telegram.org/bot${TOKEN}/setWebhook`);
		expect(init.method).toBe('POST');
		expect(JSON.parse(init.body)).toEqual({
			url: 'https://x.example/hook',
			secret_token: 'secret-1',
			allowed_updates: ['message'],
			drop_pending_updates: false,
		});
	});

	it('sendMessage sends the text to the chat and returns what Telegram stored', async () => {
		fetchMock.mockResolvedValue(ok({ message_id: 42, date: 1_760_000_000 }));

		await expect(client.sendMessage(TOKEN, 555, 'claro!')).resolves.toEqual({
			messageId: 42,
			sentAt: new Date(1_760_000_000 * 1000),
		});

		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe(`https://api.telegram.org/bot${TOKEN}/sendMessage`);
		expect(JSON.parse(init.body)).toEqual({ chat_id: 555, text: 'claro!' });
	});

	it('sendMessage reports why Telegram refused, such as a blocked bot', async () => {
		fetchMock.mockResolvedValue(
			fail(403, 'Forbidden: bot was blocked by the user'),
		);

		const error = await client.sendMessage(TOKEN, 555, 'oi').catch((e) => e);

		expect(error).toBeInstanceOf(TelegramApiError);
		expect(error).toMatchObject({
			status: 403,
			description: 'Forbidden: bot was blocked by the user',
		});
	});

	it('deleteWebhook asks Telegram to forget the webhook', async () => {
		fetchMock.mockResolvedValue(ok(true));

		await client.deleteWebhook(TOKEN);

		expect(fetchMock.mock.calls[0][0]).toBe(
			`https://api.telegram.org/bot${TOKEN}/deleteWebhook`,
		);
	});

	it('getWebhookInfo exposes what is pending and the last delivery error', async () => {
		fetchMock.mockResolvedValue(
			ok({
				url: 'https://x.example/hook',
				pending_update_count: 3,
				last_error_message: 'Wrong response from the webhook: 500',
				last_error_date: 1_760_000_000,
			}),
		);

		await expect(client.getWebhookInfo(TOKEN)).resolves.toEqual({
			url: 'https://x.example/hook',
			pendingUpdateCount: 3,
			lastErrorMessage: 'Wrong response from the webhook: 500',
			lastErrorDate: new Date(1_760_000_000 * 1000),
			lastSynchronizationErrorDate: null,
			hasCustomCertificate: false,
			ipAddress: null,
			maxConnections: null,
			allowedUpdates: [],
		});
	});

	it('getWebhookInfo returns every field Telegram sends', async () => {
		fetchMock.mockResolvedValue(
			ok({
				url: 'https://x.example/hook',
				has_custom_certificate: true,
				pending_update_count: 0,
				ip_address: '149.154.167.220',
				last_synchronization_error_date: 1_760_000_100,
				max_connections: 40,
				allowed_updates: ['message'],
			}),
		);

		await expect(client.getWebhookInfo(TOKEN)).resolves.toMatchObject({
			hasCustomCertificate: true,
			ipAddress: '149.154.167.220',
			lastSynchronizationErrorDate: new Date(1_760_000_100 * 1000),
			maxConnections: 40,
			allowedUpdates: ['message'],
		});
	});

	it('getWebhookInfo copes with no error at all', async () => {
		fetchMock.mockResolvedValue(ok({ url: '', pending_update_count: 0 }));

		await expect(client.getWebhookInfo(TOKEN)).resolves.toMatchObject({
			url: '',
			pendingUpdateCount: 0,
			lastErrorMessage: null,
			lastErrorDate: null,
		});
	});

	it("turns an API refusal into a TelegramApiError carrying Telegram's reason", async () => {
		fetchMock.mockResolvedValue(fail(401, 'Unauthorized'));

		const error = await client.getMe(TOKEN).catch((e) => e);

		expect(error).toBeInstanceOf(TelegramApiError);
		expect(error).toMatchObject({ status: 401, description: 'Unauthorized' });
	});

	it('never lets the bot token reach an error message', async () => {
		fetchMock.mockRejectedValue(
			new Error(`request to https://api.telegram.org/bot${TOKEN}/getMe failed`),
		);

		const error = await client.getMe(TOKEN).catch((e) => e);

		expect(error).toBeInstanceOf(TelegramApiError);
		expect(error.message).not.toContain(TOKEN);
		expect(error.message).not.toContain('AAHsecret');
	});

	it('treats an answer that is not JSON as an error', async () => {
		fetchMock.mockResolvedValue({
			ok: false,
			status: 502,
			json: async () => {
				throw new Error('Unexpected token <');
			},
		});

		await expect(client.getMe(TOKEN)).rejects.toBeInstanceOf(TelegramApiError);
	});
});
