import { MessengerGraphClient } from './messenger.graph-client';
import { MetaApiError } from './messenger.types';

const TOKEN = 'EAAG-super-secret-token-value';

const ok = (body: any): any => ({
	ok: true,
	status: 200,
	json: async () => body,
});

const fail = (status: number, code: number, message: string): any => ({
	ok: false,
	status,
	json: async () => ({ error: { code, message } }),
});

describe('MessengerGraphClient', () => {
	const client = new MessengerGraphClient();
	const fetchMock = jest.fn();
	const saved = { ...process.env };

	beforeEach(() => {
		fetchMock.mockReset();
		(global as any).fetch = fetchMock;
		process.env.META_APP_ID = 'app-id';
		process.env.META_APP_SECRET = 'app-secret';
		process.env.META_REDIRECT_URI =
			'https://x.example/api/v1/apps/messenger/callback';
		delete process.env.META_GRAPH_VERSION;
	});

	afterAll(() => {
		Object.assign(process.env, saved);
	});

	describe('buildAuthUrl', () => {
		it('sends the user to Facebook with the app, the permissions, the redirect and the state', () => {
			const url = new URL(client.buildAuthUrl('STATE123'));

			expect(url.origin + url.pathname).toBe(
				'https://www.facebook.com/v23.0/dialog/oauth',
			);
			expect(url.searchParams.get('client_id')).toBe('app-id');
			expect(url.searchParams.get('redirect_uri')).toBe(
				'https://x.example/api/v1/apps/messenger/callback',
			);
			expect(url.searchParams.get('state')).toBe('STATE123');
			expect(url.searchParams.get('response_type')).toBe('code');
			expect(url.searchParams.get('scope')!.split(',')).toEqual([
				'pages_show_list',
				'pages_messaging',
				'pages_manage_metadata',
			]);
		});

		it('uses the Graph version from the environment when one is set', () => {
			process.env.META_GRAPH_VERSION = 'v99.0';

			expect(client.buildAuthUrl('s')).toContain('/v99.0/dialog/oauth');
		});
	});

	describe('exchangeCode', () => {
		it('trades the code for a user token, keeping the secret out of the URL', async () => {
			fetchMock.mockResolvedValue(ok({ access_token: 'USER_SHORT' }));

			await expect(client.exchangeCode('CODE')).resolves.toBe('USER_SHORT');

			const [url, init] = fetchMock.mock.calls[0];
			expect(url).toBe('https://graph.facebook.com/v23.0/oauth/access_token');
			expect(init.method).toBe('POST');
			const body = new URLSearchParams(init.body);
			expect(body.get('code')).toBe('CODE');
			expect(body.get('client_id')).toBe('app-id');
			expect(body.get('client_secret')).toBe('app-secret');
			expect(body.get('redirect_uri')).toBe(
				'https://x.example/api/v1/apps/messenger/callback',
			);
		});
	});

	describe('extendToken', () => {
		it('asks for the long-lived version of the user token', async () => {
			fetchMock.mockResolvedValue(ok({ access_token: 'USER_LONG' }));

			await expect(client.extendToken('USER_SHORT')).resolves.toBe('USER_LONG');

			const body = new URLSearchParams(fetchMock.mock.calls[0][1].body);
			expect(body.get('grant_type')).toBe('fb_exchange_token');
			expect(body.get('fb_exchange_token')).toBe('USER_SHORT');
		});
	});

	describe('listPages', () => {
		it('lists the pages with the token of each, authorizing by header', async () => {
			fetchMock.mockResolvedValue(
				ok({
					data: [
						{ id: '1', name: 'Loja', access_token: 'PAGE1' },
						{ id: '2', name: 'Outra', access_token: 'PAGE2' },
					],
				}),
			);

			await expect(client.listPages('USER_LONG')).resolves.toEqual([
				{ id: '1', name: 'Loja', accessToken: 'PAGE1' },
				{ id: '2', name: 'Outra', accessToken: 'PAGE2' },
			]);

			const [url, init] = fetchMock.mock.calls[0];
			expect(url).toContain('/v23.0/me/accounts');
			expect(url).not.toContain('USER_LONG');
			expect(init.headers.Authorization).toBe('Bearer USER_LONG');
		});

		it('skips a page that came without a token', async () => {
			fetchMock.mockResolvedValue(
				ok({ data: [{ id: '1', name: 'Sem token' }] }),
			);

			await expect(client.listPages('U')).resolves.toEqual([]);
		});

		it('is an empty list for a user with no pages', async () => {
			fetchMock.mockResolvedValue(ok({}));

			await expect(client.listPages('U')).resolves.toEqual([]);
		});
	});

	describe('subscribePage / unsubscribePage', () => {
		it('subscribes the app to the messages of the page', async () => {
			fetchMock.mockResolvedValue(ok({ success: true }));

			await client.subscribePage('123', 'PAGE_TOKEN');

			const [url, init] = fetchMock.mock.calls[0];
			expect(url).toBe('https://graph.facebook.com/v23.0/123/subscribed_apps');
			expect(init.method).toBe('POST');
			expect(init.headers.Authorization).toBe('Bearer PAGE_TOKEN');
			expect(
				new URLSearchParams(init.body).get('subscribed_fields')!.split(','),
			).toEqual(['messages', 'messaging_postbacks', 'message_echoes']);
		});

		it('unsubscribes with DELETE', async () => {
			fetchMock.mockResolvedValue(ok({ success: true }));

			await client.unsubscribePage('123', 'PAGE_TOKEN');

			expect(fetchMock.mock.calls[0][0]).toBe(
				'https://graph.facebook.com/v23.0/123/subscribed_apps',
			);
			expect(fetchMock.mock.calls[0][1].method).toBe('DELETE');
		});
	});

	describe('errors', () => {
		it("turns Meta's refusal into a MetaApiError with its code and reason", async () => {
			fetchMock.mockResolvedValue(
				fail(400, 190, 'Invalid OAuth access token.'),
			);

			const error = await client.listPages('U').catch((e) => e);

			expect(error).toBeInstanceOf(MetaApiError);
			expect(error).toMatchObject({
				status: 400,
				code: 190,
				description: 'Invalid OAuth access token.',
			});
		});

		it('never lets a token reach an error message', async () => {
			fetchMock.mockRejectedValue(
				new Error(`failed https://x?access_token=${TOKEN}`),
			);

			const error = await client.listPages(TOKEN).catch((e) => e);

			expect(error).toBeInstanceOf(MetaApiError);
			expect(error.status).toBe(0);
			expect(error.message).not.toContain(TOKEN);
		});

		it('treats an answer that is not JSON as an error', async () => {
			fetchMock.mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => {
					throw new Error('bad json');
				},
			});

			await expect(client.listPages('U')).rejects.toBeInstanceOf(MetaApiError);
		});
	});

	describe('sendText', () => {
		it('answers inside the 24 hour window, as JSON, authorized by the Page token', async () => {
			fetchMock.mockResolvedValue(
				ok({ recipient_id: 'PSID1', message_id: 'mid.9' }),
			);

			const sent = await client.sendText('PAGE_TOKEN', 'PSID1', 'claro!');

			const [url, init] = fetchMock.mock.calls[0];
			expect(url).toBe('https://graph.facebook.com/v23.0/me/messages');
			expect(init.method).toBe('POST');
			expect(init.headers.Authorization).toBe('Bearer PAGE_TOKEN');
			expect(init.headers['Content-Type']).toBe('application/json');
			expect(JSON.parse(init.body)).toEqual({
				recipient: { id: 'PSID1' },
				messaging_type: 'RESPONSE',
				message: { text: 'claro!' },
			});
			expect(sent.mid).toBe('mid.9');
			expect(sent.sentAt).toBeInstanceOf(Date);
		});
	});

	describe('getProfile', () => {
		it('reads the name and picture of a person who wrote to the Page', async () => {
			fetchMock.mockResolvedValue(
				ok({
					first_name: 'Ana',
					last_name: 'Souza',
					profile_pic: 'https://x/p.jpg',
				}),
			);

			await expect(client.getProfile('PAGE_TOKEN', 'PSID1')).resolves.toEqual({
				name: 'Ana Souza',
				profilePic: 'https://x/p.jpg',
			});
			expect(fetchMock.mock.calls[0][0]).toContain('/v23.0/PSID1?fields=');
			expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe(
				'Bearer PAGE_TOKEN',
			);
		});

		it('copes with a profile that has no name', async () => {
			fetchMock.mockResolvedValue(ok({}));

			await expect(client.getProfile('T', 'P')).resolves.toEqual({
				name: null,
				profilePic: null,
			});
		});
	});

	describe('fetchAttachment', () => {
		const file = (type = 'image/jpeg', length = 3) => ({
			ok: true,
			status: 200,
			headers: {
				get: (h: string) => (h === 'content-type' ? type : String(length)),
			},
			arrayBuffer: async () => new Uint8Array(length).buffer,
		});

		it("downloads a file from Facebook's own CDN", async () => {
			fetchMock.mockResolvedValue(file());

			const result = await client.fetchAttachment(
				'https://scontent.xx.fbcdn.net/a.jpg',
			);

			expect(result.contentType).toBe('image/jpeg');
			expect(result.buffer.length).toBe(3);
		});

		it.each([
			'http://scontent.xx.fbcdn.net/a.jpg',
			'https://evil.example/a.jpg',
			'https://fbcdn.net.evil.example/a.jpg',
			'https://169.254.169.254/latest/meta-data',
			'not a url',
			'file:///etc/passwd',
		])(
			"never fetches an address that is not Facebook's CDN (%s)",
			async (url) => {
				await expect(client.fetchAttachment(url)).rejects.toBeInstanceOf(
					MetaApiError,
				);
				expect(fetchMock).not.toHaveBeenCalled();
			},
		);

		it('refuses a file that is too large', async () => {
			fetchMock.mockResolvedValue(file('video/mp4', 30 * 1024 * 1024));

			await expect(
				client.fetchAttachment('https://video.xx.fbcdn.net/v.mp4'),
			).rejects.toBeInstanceOf(MetaApiError);
		});

		it('says so when the address has expired', async () => {
			fetchMock.mockResolvedValue({
				ok: false,
				status: 403,
				headers: { get: () => null },
			});

			const error = await client
				.fetchAttachment('https://scontent.xx.fbcdn.net/a.jpg')
				.catch((e) => e);

			expect(error).toBeInstanceOf(MetaApiError);
			expect(error.status).toBe(403);
		});
	});

	describe('getPermissions', () => {
		it('says which permissions the user allowed and which they declined', async () => {
			fetchMock.mockResolvedValue(
				ok({
					data: [
						{ permission: 'pages_show_list', status: 'granted' },
						{ permission: 'pages_messaging', status: 'declined' },
						{ permission: 'public_profile', status: 'granted' },
					],
				}),
			);

			await expect(client.getPermissions('USER_LONG')).resolves.toEqual({
				granted: ['pages_show_list', 'public_profile'],
				declined: ['pages_messaging'],
			});

			const [url, init] = fetchMock.mock.calls[0];
			expect(url).toBe('https://graph.facebook.com/v23.0/me/permissions');
			expect(init.headers.Authorization).toBe('Bearer USER_LONG');
		});

		it('is empty when Meta lists nothing', async () => {
			fetchMock.mockResolvedValue(ok({}));

			await expect(client.getPermissions('U')).resolves.toEqual({
				granted: [],
				declined: [],
			});
		});
	});

	describe('getParticipantName', () => {
		it("reads the person's name from the conversation of the Page with them", async () => {
			fetchMock.mockResolvedValue(
				ok({
					data: [
						{
							participants: {
								data: [
									{ id: 'PSID1', name: 'Ana Souza' },
									{ id: 'PAGE1', name: 'Social Prices' },
								],
							},
						},
					],
				}),
			);

			await expect(
				client.getParticipantName('PAGE_TOKEN', 'PAGE1', 'PSID1'),
			).resolves.toBe('Ana Souza');

			const [url, init] = fetchMock.mock.calls[0];
			expect(url).toContain('/v23.0/PAGE1/conversations?');
			expect(url).toContain('user_id=PSID1');
			expect(url).toContain('fields=participants');
			expect(init.headers.Authorization).toBe('Bearer PAGE_TOKEN');
		});

		it('is null when the conversation is not there, or the person is not in it', async () => {
			fetchMock.mockResolvedValue(ok({ data: [] }));
			await expect(
				client.getParticipantName('T', 'PAGE1', 'PSID1'),
			).resolves.toBeNull();

			fetchMock.mockResolvedValue(
				ok({
					data: [{ participants: { data: [{ id: 'PAGE1', name: 'Loja' }] } }],
				}),
			);
			await expect(
				client.getParticipantName('T', 'PAGE1', 'PSID1'),
			).resolves.toBeNull();
		});
	});

	describe('sendAttachment', () => {
		const file = (mimeType: string, fileName = 'f.bin') => ({
			buffer: Buffer.alloc(8),
			fileName,
			mimeType,
		});

		it.each([
			['image/jpeg', 'image'],
			['image/png', 'image'],
			['image/gif', 'image'],
			['video/mp4', 'video'],
			['audio/wav', 'audio'],
			['audio/x-wav', 'audio'],
			['audio/mpeg', 'audio'],
			['audio/mp4', 'audio'],
			['audio/aac', 'audio'],
			['application/pdf', 'file'],
			['audio/ogg', 'file'],
			['image/svg+xml', 'file'],
		])('%s goes as "%s"', async (mimeType, type) => {
			fetchMock.mockResolvedValue(
				ok({ recipient_id: 'PSID1', message_id: 'mid.7' }),
			);

			const sent = await client.sendAttachment(
				'PAGE_TOKEN',
				'PSID1',
				file(mimeType),
			);

			const [url, init] = fetchMock.mock.calls[0];
			expect(url).toBe('https://graph.facebook.com/v23.0/me/messages');
			expect(init.method).toBe('POST');
			expect(init.headers.Authorization).toBe('Bearer PAGE_TOKEN');
			// A form sets its own content type, boundary included.
			expect(init.headers['Content-Type']).toBeUndefined();
			expect(init.body).toBeInstanceOf(FormData);
			expect(JSON.parse(init.body.get('recipient'))).toEqual({ id: 'PSID1' });
			expect(init.body.get('messaging_type')).toBe('RESPONSE');
			expect(JSON.parse(init.body.get('message'))).toEqual({
				attachment: { type, payload: { is_reusable: false } },
			});
			expect(init.body.get('filedata')).toBeInstanceOf(Blob);
			expect(sent).toMatchObject({ mid: 'mid.7', type });
			expect(sent.sentAt).toBeInstanceOf(Date);
		});

		it('keeps the file name', async () => {
			fetchMock.mockResolvedValue(ok({ message_id: 'mid.7' }));

			await client.sendAttachment(
				'T',
				'P',
				file('application/pdf', 'orcamento.pdf'),
			);

			expect(fetchMock.mock.calls[0][1].body.get('filedata').name).toBe(
				'orcamento.pdf',
			);
		});

		it('never lets the token reach the error of a failed upload', async () => {
			fetchMock.mockRejectedValue(new Error(`failed ${TOKEN}`));

			const error = await client
				.sendAttachment(TOKEN, 'P', file('image/png'))
				.catch((e) => e);

			expect(error).toBeInstanceOf(MetaApiError);
			expect(error.message).not.toContain(TOKEN);
		});
	});
});
