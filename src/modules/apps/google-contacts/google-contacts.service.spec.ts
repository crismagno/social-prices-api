import AppsEnum from '../interfaces/apps.enum';
import { GoogleContactsAccessDeniedException } from './google-contacts.exceptions';
import { GoogleContactsService } from './google-contacts.service';
import { GooglePeopleApiError } from './google-contacts.types';

const APP = AppsEnum.App.GOOGLE_CONTACTS;
const CTX = { ownerUserId: 'u1', employeeId: 'e1' };
const CONTACTS_SCOPE = 'https://www.googleapis.com/auth/contacts.readonly';

const build = (opts: { user?: any } = {}) => {
	process.env.SOCIAL_PRICES_URL = 'http://web.test/';

	const oauth: any = {
		buildAuthUrl: jest.fn().mockReturnValue('https://google/auth?state=S'),
		exchangeCode: jest.fn().mockResolvedValue({
			accessToken: 'AT',
			refreshToken: 'RT',
			expiresAt: new Date('2030-01-01'),
			scopes: [CONTACTS_SCOPE],
		}),
		fetchAccountEmail: jest.fn().mockResolvedValue('me@example.com'),
		revoke: jest.fn().mockResolvedValue(undefined),
	};
	const state: any = {
		sign: jest.fn().mockResolvedValue('SIGNED'),
		verify: jest.fn().mockResolvedValue({
			ownerUserId: 'u1',
			employeeId: 'e1',
		}),
	};
	const connections: any = {
		saveConnection: jest.fn().mockResolvedValue({}),
		findWithTokens: jest.fn().mockResolvedValue({
			tokens: 'ENC',
		}),
		readTokens: jest
			.fn()
			.mockReturnValue({ accessToken: 'AT', refreshToken: 'RT' }),
		deleteByOwner: jest.fn().mockResolvedValue(undefined),
	};
	const preview: any = {
		preview: jest.fn().mockResolvedValue({ contacts: [], hasMore: false }),
	};
	const importer: any = {
		importSelected: jest.fn().mockResolvedValue({ created: 3 }),
	};
	const users: any = {
		findOneById: jest
			.fn()
			.mockResolvedValue(opts.user ?? { enabledApps: [APP] }),
	};

	return {
		oauth,
		state,
		connections,
		preview,
		importer,
		users,
		service: new GoogleContactsService(
			oauth,
			state,
			connections,
			preview,
			importer,
			users,
		),
	};
};

describe('GoogleContactsService', () => {
	it('builds the connect url from a signed state', async () => {
		const { service, state, oauth } = build();

		await expect(service.getConnectUrl(CTX)).resolves.toBe(
			'https://google/auth?state=S',
		);
		expect(state.sign).toHaveBeenCalledWith({
			ownerUserId: 'u1',
			employeeId: 'e1',
		});
		expect(oauth.buildAuthUrl).toHaveBeenCalledWith('SIGNED');
	});

	describe('handleCallback', () => {
		it('connects and redirects to the app page on success', async () => {
			const { service, connections } = build();

			const result = await service.handleCallback({ code: 'C', state: 'S' });

			expect(result.redirectTo).toBe('http://web.test/apps/google-contacts');
			expect(connections.saveConnection).toHaveBeenCalledWith({
				ownerUserId: 'u1',
				googleEmail: 'me@example.com',
				tokens: { accessToken: 'AT', refreshToken: 'RT' },
				grantedScopes: [CONTACTS_SCOPE],
				accessTokenExpiresAt: new Date('2030-01-01'),
			});
		});

		it('redirects with access_denied when the user cancels at Google', async () => {
			const { service, connections } = build();

			const result = await service.handleCallback({ error: 'access_denied' });

			expect(result.redirectTo).toBe(
				'http://web.test/apps/google-contacts?error=access_denied',
			);
			expect(connections.saveConnection).not.toHaveBeenCalled();
		});

		it('redirects with oauth_error for any other Google error', async () => {
			const { service } = build();

			expect(
				(await service.handleCallback({ error: 'server_error' })).redirectTo,
			).toContain('error=oauth_error');
		});

		it('never connects with an invalid, expired or tampered state', async () => {
			const { service, state, connections, oauth } = build();
			state.verify.mockRejectedValue(new Error('jwt expired'));

			const result = await service.handleCallback({ code: 'C', state: 'BAD' });

			expect(result.redirectTo).toContain('error=invalid_state');
			expect(oauth.exchangeCode).not.toHaveBeenCalled();
			expect(connections.saveConnection).not.toHaveBeenCalled();
		});

		it('never connects when the state parameter is missing', async () => {
			const { service, state, connections } = build();
			state.verify.mockRejectedValue(new Error('jwt must be provided'));

			const result = await service.handleCallback({ code: 'C' });

			expect(result.redirectTo).toContain('error=invalid_state');
			expect(connections.saveConnection).not.toHaveBeenCalled();
		});

		it('requires a code', async () => {
			const { service } = build();

			expect(
				(await service.handleCallback({ state: 'S' })).redirectTo,
			).toContain('error=missing_code');
		});

		it('does not connect if the manager disabled the app in the meantime', async () => {
			const { service, connections } = build({ user: { enabledApps: [] } });

			const result = await service.handleCallback({ code: 'C', state: 'S' });

			expect(result.redirectTo).toContain('error=not_enabled');
			expect(connections.saveConnection).not.toHaveBeenCalled();
		});

		it('refuses a connection Google gave no refresh token for', async () => {
			const { service, oauth, connections } = build();
			oauth.exchangeCode.mockResolvedValue({
				accessToken: 'AT',
				refreshToken: null,
				expiresAt: new Date(),
				scopes: [],
			});

			const result = await service.handleCallback({ code: 'C', state: 'S' });

			expect(result.redirectTo).toContain('error=no_refresh_token');
			expect(connections.saveConnection).not.toHaveBeenCalled();
		});

		it('refuses a connection where the user unchecked the contacts permission', async () => {
			const { service, oauth, connections } = build();
			oauth.exchangeCode.mockResolvedValue({
				accessToken: 'AT',
				refreshToken: 'RT',
				expiresAt: new Date(),
				scopes: ['https://www.googleapis.com/auth/userinfo.email'],
			});

			const result = await service.handleCallback({ code: 'C', state: 'S' });

			expect(result.redirectTo).toContain('error=missing_scope');
			expect(connections.saveConnection).not.toHaveBeenCalled();
		});

		it('redirects with connection_failed instead of throwing when Google is down', async () => {
			const { service, oauth } = build();
			oauth.exchangeCode.mockRejectedValue(new Error('network'));

			const result = await service.handleCallback({ code: 'C', state: 'S' });

			expect(result.redirectTo).toContain('error=connection_failed');
		});
	});

	describe('disconnect', () => {
		it('revokes at Google then deletes the connection', async () => {
			const { service, oauth, connections } = build();

			await service.disconnect(CTX);

			expect(oauth.revoke).toHaveBeenCalledWith('RT');
			expect(connections.deleteByOwner).toHaveBeenCalledWith('u1');
		});

		it('still deletes locally when the stored tokens cannot be read', async () => {
			const { service, connections } = build();
			connections.readTokens.mockImplementation(() => {
				throw new Error('bad key');
			});

			await service.disconnect(CTX);

			expect(connections.deleteByOwner).toHaveBeenCalledWith('u1');
		});

		it('is a no-op for a user that never connected', async () => {
			const { service, oauth, connections } = build();
			connections.findWithTokens.mockResolvedValue(null);

			await service.disconnect(CTX);

			expect(oauth.revoke).not.toHaveBeenCalled();
			expect(connections.deleteByOwner).toHaveBeenCalledWith('u1');
		});
	});

	it('listContacts returns the contacts preview for the owner', async () => {
		const { service, preview } = build();

		await expect(service.listContacts(CTX)).resolves.toEqual({
			contacts: [],
			hasMore: false,
		});
		expect(preview.preview).toHaveBeenCalledWith('u1');
	});

	it('importSelected passes the owner and the chosen ids', async () => {
		const { service, importer } = build();

		await expect(service.importSelected(CTX, ['people/c1'])).resolves.toEqual({
			created: 3,
		});
		expect(importer.importSelected).toHaveBeenCalledWith('u1', ['people/c1']);
	});

	it('turns a Google 403 into a typed exception that carries the reason', async () => {
		const { service, preview, importer } = build();
		const denied = new GooglePeopleApiError(403, 'SERVICE_DISABLED', 'API off');
		preview.preview.mockRejectedValue(denied);
		importer.importSelected.mockRejectedValue(denied);

		for (const call of [
			() => service.listContacts(CTX),
			() => service.importSelected(CTX, ['people/c1']),
		]) {
			const error = await call().catch((e) => e);

			expect(error).toBeInstanceOf(GoogleContactsAccessDeniedException);
			expect(JSON.stringify(error.getResponse())).toContain('SERVICE_DISABLED');
		}
	});

	it('lets other errors through untouched', async () => {
		const { service, preview } = build();
		preview.preview.mockRejectedValue(new Error('boom'));

		await expect(service.listContacts(CTX)).rejects.toThrow('boom');
	});
});
