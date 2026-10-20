import { InstagramGraphClient } from './instagram.graph-client';
import { InstagramApiError } from './instagram.types';

const TOKEN = 'IGAA-super-secret-token-value';

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

describe('InstagramGraphClient', () => {
	const client = new InstagramGraphClient();
	const fetchMock = jest.fn();
	const saved = { ...process.env };

	beforeEach(() => {
		fetchMock.mockReset();
		(global as any).fetch = fetchMock;
		process.env.INSTAGRAM_APP_ID = 'ig-app-id';
		process.env.INSTAGRAM_APP_SECRET = 'ig-app-secret';
		process.env.INSTAGRAM_REDIRECT_URI =
			'https://x.example/api/v1/apps/instagram/callback';
		delete process.env.INSTAGRAM_GRAPH_VERSION;
	});

	afterAll(() => {
		Object.assign(process.env, saved);
	});

	describe('buildAuthUrl', () => {
		it('sends the user to Instagram with the app, the permissions, the redirect and the state', () => {
			const url = new URL(client.buildAuthUrl('STATE123'));

			expect(url.origin + url.pathname).toBe(
				'https://www.instagram.com/oauth/authorize',
			);
			expect(url.searchParams.get('client_id')).toBe('ig-app-id');
			expect(url.searchParams.get('redirect_uri')).toBe(
				'https://x.example/api/v1/apps/instagram/callback',
			);
			expect(url.searchParams.get('state')).toBe('STATE123');
			expect(url.searchParams.get('response_type')).toBe('code');
			expect(url.searchParams.get('scope')!.split(',')).toEqual([
				'instagram_business_basic',
				'instagram_business_manage_messages',
			]);
		});
	});

	describe('exchangeCode', () => {
		it('trades the code for a short-lived token, keeping the secret in the body, not the URL', async () => {
			fetchMock.mockResolvedValue(
				ok({
					access_token: 'SHORT',
					user_id: 17841,
					permissions: [
						'instagram_business_basic',
						'instagram_business_manage_messages',
					],
				}),
			);

			await expect(client.exchangeCode('CODE')).resolves.toEqual({
				accessToken: 'SHORT',
				permissions: [
					'instagram_business_basic',
					'instagram_business_manage_messages',
				],
			});

			const [url, init] = fetchMock.mock.calls[0];
			expect(url).toBe('https://api.instagram.com/oauth/access_token');
			expect(init.method).toBe('POST');
			const body = new URLSearchParams(init.body);
			expect(body.get('code')).toBe('CODE');
			expect(body.get('client_id')).toBe('ig-app-id');
			expect(body.get('client_secret')).toBe('ig-app-secret');
			expect(body.get('grant_type')).toBe('authorization_code');
			expect(body.get('redirect_uri')).toBe(
				'https://x.example/api/v1/apps/instagram/callback',
			);
		});

		it('reads the answer when it comes wrapped in a list, with the permissions as one string', async () => {
			fetchMock.mockResolvedValue(
				ok({
					data: [
						{
							access_token: 'SHORT',
							user_id: 1,
							permissions:
								'instagram_business_basic,instagram_business_manage_messages',
						},
					],
				}),
			);

			await expect(client.exchangeCode('CODE')).resolves.toEqual({
				accessToken: 'SHORT',
				permissions: [
					'instagram_business_basic',
					'instagram_business_manage_messages',
				],
			});
		});
	});

	describe('extendToken and refreshToken', () => {
		it('extends the short-lived token to the long-lived one, with its expiry', async () => {
			fetchMock.mockResolvedValue(
				ok({ access_token: 'LONG', token_type: 'bearer', expires_in: 5184000 }),
			);
			const before = Date.now();

			const token = await client.extendToken('SHORT');

			expect(token.accessToken).toBe('LONG');
			expect(token.expiresAt.getTime()).toBeGreaterThanOrEqual(
				before + 5184000 * 1000,
			);

			const url = new URL(fetchMock.mock.calls[0][0]);
			expect(url.origin + url.pathname).toBe(
				'https://graph.instagram.com/access_token',
			);
			expect(url.searchParams.get('grant_type')).toBe('ig_exchange_token');
			expect(url.searchParams.get('client_secret')).toBe('ig-app-secret');
			expect(url.searchParams.get('access_token')).toBe('SHORT');
		});

		it('refreshes a long-lived token for another stretch', async () => {
			fetchMock.mockResolvedValue(
				ok({ access_token: 'NEWER', expires_in: 5184000 }),
			);

			const token = await client.refreshToken('LONG');

			expect(token.accessToken).toBe('NEWER');
			const url = new URL(fetchMock.mock.calls[0][0]);
			expect(url.pathname).toBe('/refresh_access_token');
			expect(url.searchParams.get('grant_type')).toBe('ig_refresh_token');
			expect(url.searchParams.get('access_token')).toBe('LONG');
		});
	});

	describe('getAccount', () => {
		it('reads the account that logged in, authorizing by header', async () => {
			fetchMock.mockResolvedValue(
				ok({
					user_id: '1789',
					username: 'loja_ana',
					name: 'Loja da Ana',
					profile_picture_url: 'https://x/p.jpg',
					account_type: 'BUSINESS',
				}),
			);

			await expect(client.getAccount('LONG')).resolves.toEqual({
				userId: '1789',
				username: 'loja_ana',
				name: 'Loja da Ana',
				profilePictureUrl: 'https://x/p.jpg',
				accountType: 'BUSINESS',
			});

			const [url, init] = fetchMock.mock.calls[0];
			expect(url).toContain('https://graph.instagram.com/v23.0/me?fields=');
			expect(url).not.toContain('LONG');
			expect(init.headers.Authorization).toBe('Bearer LONG');
		});
	});

	describe('subscribeAccount / unsubscribeAccount', () => {
		it('subscribes the app to the messages of the account', async () => {
			fetchMock.mockResolvedValue(ok({ success: true }));

			await client.subscribeAccount('1789', 'LONG');

			const [url, init] = fetchMock.mock.calls[0];
			expect(url).toBe(
				'https://graph.instagram.com/v23.0/1789/subscribed_apps',
			);
			expect(init.method).toBe('POST');
			expect(init.headers.Authorization).toBe('Bearer LONG');
			expect(new URLSearchParams(init.body).get('subscribed_fields')).toBe(
				'messages',
			);
		});

		it('unsubscribes with DELETE', async () => {
			fetchMock.mockResolvedValue(ok({ success: true }));

			await client.unsubscribeAccount('1789', 'LONG');

			expect(fetchMock.mock.calls[0][1].method).toBe('DELETE');
		});
	});

	describe('sendText', () => {
		it('answers inside the 24 hour window, as JSON, authorized by header', async () => {
			fetchMock.mockResolvedValue(
				ok({ recipient_id: 'IGSID1', message_id: 'mid.9' }),
			);

			const sent = await client.sendText('LONG', '1789', 'IGSID1', 'claro!');

			const [url, init] = fetchMock.mock.calls[0];
			expect(url).toBe('https://graph.instagram.com/v23.0/1789/messages');
			expect(init.method).toBe('POST');
			expect(init.headers.Authorization).toBe('Bearer LONG');
			expect(init.headers['Content-Type']).toBe('application/json');
			expect(JSON.parse(init.body)).toEqual({
				recipient: { id: 'IGSID1' },
				message: { text: 'claro!' },
			});
			expect(sent.mid).toBe('mid.9');
			expect(sent.sentAt).toBeInstanceOf(Date);
		});
	});

	describe('getProfile', () => {
		it('reads the name, the username and the picture of a person who wrote', async () => {
			fetchMock.mockResolvedValue(
				ok({
					name: 'Ana Souza',
					username: 'ana_s',
					profile_pic: 'https://x/p.jpg',
				}),
			);

			await expect(client.getProfile('LONG', 'IGSID1')).resolves.toEqual({
				name: 'Ana Souza',
				username: 'ana_s',
				profilePic: 'https://x/p.jpg',
			});
			expect(fetchMock.mock.calls[0][0]).toContain('/v23.0/IGSID1?fields=');
		});

		it('copes with a profile that has nothing', async () => {
			fetchMock.mockResolvedValue(ok({}));

			await expect(client.getProfile('T', 'P')).resolves.toEqual({
				name: null,
				username: null,
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

		it("downloads a file from Instagram's own CDN", async () => {
			fetchMock.mockResolvedValue(file());

			const result = await client.fetchAttachment(
				'https://scontent.cdninstagram.com/a.jpg',
			);

			expect(result.contentType).toBe('image/jpeg');
			expect(result.buffer.length).toBe(3);
		});

		it.each([
			'http://scontent.cdninstagram.com/a.jpg',
			'https://evil.example/a.jpg',
			'https://cdninstagram.com.evil.example/a.jpg',
			'https://169.254.169.254/latest/meta-data',
			'not a url',
			'file:///etc/passwd',
		])(
			"never fetches an address that is not Instagram's CDN (%s)",
			async (url) => {
				await expect(client.fetchAttachment(url)).rejects.toBeInstanceOf(
					InstagramApiError,
				);
				expect(fetchMock).not.toHaveBeenCalled();
			},
		);

		it('refuses a file that is too large, and says so when the address has expired', async () => {
			fetchMock.mockResolvedValue(file('video/mp4', 30 * 1024 * 1024));
			await expect(
				client.fetchAttachment('https://video.fbcdn.net/v.mp4'),
			).rejects.toBeInstanceOf(InstagramApiError);

			fetchMock.mockResolvedValue({
				ok: false,
				status: 403,
				headers: { get: () => null },
			});
			const error = await client
				.fetchAttachment('https://scontent.cdninstagram.com/a.jpg')
				.catch((e) => e);
			expect(error.status).toBe(403);
		});
	});

	describe('errors', () => {
		it("turns Instagram's refusal into an InstagramApiError with its code and reason", async () => {
			fetchMock.mockResolvedValue(
				fail(400, 190, 'Invalid OAuth access token.'),
			);

			const error = await client.getAccount('T').catch((e) => e);

			expect(error).toBeInstanceOf(InstagramApiError);
			expect(error).toMatchObject({
				status: 400,
				code: 190,
				description: 'Invalid OAuth access token.',
			});
		});

		it('also reads the refusal of the login endpoint, which has its own shape', async () => {
			fetchMock.mockResolvedValue({
				ok: false,
				status: 400,
				json: async () => ({
					error_type: 'OAuthException',
					code: 400,
					error_message: 'This authorization code has expired',
				}),
			});

			const error = await client.exchangeCode('OLD').catch((e) => e);

			expect(error).toMatchObject({
				status: 400,
				description: 'This authorization code has expired',
			});
		});

		it('never lets a token reach an error message', async () => {
			fetchMock.mockRejectedValue(
				new Error(`failed https://x?access_token=${TOKEN}`),
			);

			const error = await client.getAccount(TOKEN).catch((e) => e);

			expect(error).toBeInstanceOf(InstagramApiError);
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

			await expect(client.getAccount('U')).rejects.toBeInstanceOf(
				InstagramApiError,
			);
		});
	});
});
