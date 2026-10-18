import {
	GoogleContactsConnectionExpiredException,
	GoogleContactsNotConnectedException,
} from './google-contacts.exceptions';
import AppsEnum from '../interfaces/apps.enum';
import { GoogleAccessTokenProvider } from './google-contacts.access-token';
import { GoogleInvalidGrantError } from './google-contacts.types';

const connected = (over: any = {}) => ({
	_id: 'conn1',
	status: AppsEnum.ConnectionStatus.CONNECTED,
	accessTokenExpiresAt: new Date(Date.now() + 3_600_000),
	tokens: 'ENC',
	...over,
});

const build = (connection: any = connected()) => {
	const connections: any = {
		findWithTokens: jest.fn().mockResolvedValue(connection),
		readTokens: jest
			.fn()
			.mockReturnValue({ accessToken: 'AT', refreshToken: 'RT' }),
		updateAccessToken: jest.fn().mockResolvedValue(undefined),
		markStatus: jest.fn().mockResolvedValue(undefined),
	};
	const oauth: any = {
		refreshAccessToken: jest.fn().mockResolvedValue({
			accessToken: 'AT2',
			expiresAt: new Date(Date.now() + 3_600_000),
		}),
	};

	return {
		connections,
		oauth,
		provider: new GoogleAccessTokenProvider(connections, oauth),
	};
};

describe('GoogleAccessTokenProvider', () => {
	it('refuses when the app is not connected', async () => {
		const { provider } = build(null);

		await expect(provider.forOwner('u1')).rejects.toBeInstanceOf(
			GoogleContactsNotConnectedException,
		);
	});

	it('refuses when the connection is already EXPIRED', async () => {
		const { provider } = build(
			connected({ status: AppsEnum.ConnectionStatus.EXPIRED }),
		);

		await expect(provider.forOwner('u1')).rejects.toBeInstanceOf(
			GoogleContactsConnectionExpiredException,
		);
	});

	it('returns the stored token while it is still valid', async () => {
		const { provider, oauth } = build();

		const result = await provider.forOwner('u1');

		expect(result.accessToken).toBe('AT');
		expect(result.connection._id).toBe('conn1');
		expect(oauth.refreshAccessToken).not.toHaveBeenCalled();
	});

	it('refreshes a token that is about to expire and stores it', async () => {
		const { provider, oauth, connections } = build(
			connected({ accessTokenExpiresAt: new Date(Date.now() + 10_000) }),
		);

		const result = await provider.forOwner('u1');

		expect(oauth.refreshAccessToken).toHaveBeenCalledWith('RT');
		expect(result.accessToken).toBe('AT2');
		expect(connections.updateAccessToken).toHaveBeenCalledWith(
			'conn1',
			{ accessToken: 'AT2', refreshToken: 'RT' },
			expect.any(Date),
		);
	});

	it('marks the connection EXPIRED when Google rejects the refresh token', async () => {
		const { provider, oauth, connections } = build(
			connected({ accessTokenExpiresAt: new Date(Date.now() - 1000) }),
		);
		oauth.refreshAccessToken.mockRejectedValue(new GoogleInvalidGrantError());

		await expect(provider.forOwner('u1')).rejects.toBeInstanceOf(
			GoogleContactsConnectionExpiredException,
		);
		expect(connections.markStatus).toHaveBeenCalledWith(
			'conn1',
			AppsEnum.ConnectionStatus.EXPIRED,
		);
	});

	it('expires the connection when there is no refresh token to renew with', async () => {
		const { provider, connections } = build(
			connected({ accessTokenExpiresAt: new Date(Date.now() - 1000) }),
		);
		connections.readTokens.mockReturnValue({
			accessToken: 'AT',
			refreshToken: null,
		});

		await expect(provider.forOwner('u1')).rejects.toBeInstanceOf(
			GoogleContactsConnectionExpiredException,
		);
	});
});
