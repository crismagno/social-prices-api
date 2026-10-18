import { GoogleInvalidGrantError } from './google-contacts.types';
import { GoogleContactsOAuthClient } from './google-contacts.oauth';

const jsonResponse = (body: any, ok = true, status = 200): any => ({
	ok,
	status,
	json: async () => body,
});

describe('GoogleContactsOAuthClient', () => {
	const client = new GoogleContactsOAuthClient();
	const fetchMock = jest.fn();

	beforeEach(() => {
		process.env.GOOGLE_CLIENT_ID = 'cid';
		process.env.GOOGLE_CLIENT_SECRET = 'csecret';
		process.env.GOOGLE_REDIRECT_URI = 'http://localhost:8080/cb';
		fetchMock.mockReset();
		(global as any).fetch = fetchMock;
	});

	it('builds an offline, consent-forcing auth url carrying the state', () => {
		const url = new URL(client.buildAuthUrl('STATE123'));

		expect(url.origin + url.pathname).toBe(
			'https://accounts.google.com/o/oauth2/v2/auth',
		);
		expect(url.searchParams.get('client_id')).toBe('cid');
		expect(url.searchParams.get('redirect_uri')).toBe(
			'http://localhost:8080/cb',
		);
		expect(url.searchParams.get('response_type')).toBe('code');
		expect(url.searchParams.get('access_type')).toBe('offline');
		expect(url.searchParams.get('prompt')).toBe('consent');
		expect(url.searchParams.get('state')).toBe('STATE123');
		expect(url.searchParams.get('scope')).toContain('contacts.readonly');
		expect(url.searchParams.get('scope')).not.toContain('contacts ');
	});

	it('exchanges a code for tokens', async () => {
		fetchMock.mockResolvedValue(
			jsonResponse({
				access_token: 'at',
				refresh_token: 'rt',
				expires_in: 3600,
				scope: 'a b',
			}),
		);

		const tokens = await client.exchangeCode('CODE');

		expect(tokens).toMatchObject({
			accessToken: 'at',
			refreshToken: 'rt',
			scopes: ['a', 'b'],
		});
		expect(tokens.expiresAt.getTime()).toBeGreaterThan(Date.now() + 3_000_000);

		const [, init] = fetchMock.mock.calls[0];
		expect(String(init.body)).toContain('grant_type=authorization_code');
		expect(String(init.body)).toContain('code=CODE');
	});

	it('returns a null refresh token when Google does not send one', async () => {
		fetchMock.mockResolvedValue(
			jsonResponse({ access_token: 'at', expires_in: 3600, scope: 'a' }),
		);

		await expect(client.exchangeCode('CODE')).resolves.toMatchObject({
			refreshToken: null,
		});
	});

	it('maps invalid_grant on refresh to GoogleInvalidGrantError', async () => {
		fetchMock.mockResolvedValue(
			jsonResponse({ error: 'invalid_grant' }, false, 400),
		);

		await expect(client.refreshAccessToken('rt')).rejects.toBeInstanceOf(
			GoogleInvalidGrantError,
		);
	});

	it('throws a plain error for other token failures', async () => {
		fetchMock.mockResolvedValue(
			jsonResponse({ error: 'server_error' }, false, 500),
		);

		await expect(client.refreshAccessToken('rt')).rejects.toThrow(
			'server_error',
		);
	});

	it('revoke never throws, even when the network fails', async () => {
		fetchMock.mockRejectedValue(new Error('offline'));

		await expect(client.revoke('rt')).resolves.toBeUndefined();
	});

	it('returns null when the account e-mail cannot be read', async () => {
		fetchMock.mockResolvedValue(jsonResponse({}, false, 401));

		await expect(client.fetchAccountEmail('at')).resolves.toBeNull();
	});
});
