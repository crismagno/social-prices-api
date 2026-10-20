import AppsEnum from '../interfaces/apps.enum';
import {
	MessengerPageAlreadyConnectedException,
	MessengerPageNotAvailableException,
	MessengerPageSubscribeFailedException,
} from './messenger.exceptions';
import { MessengerService } from './messenger.service';
import { MetaApiError } from './messenger.types';

const CTX = { ownerUserId: 'u1', employeeId: null } as any;
const PAGE = { id: '123', name: 'Loja', accessToken: 'PAGE_TOKEN' };

const build = (
	opts: { enabledApps?: any; pages?: any[]; pageOwner?: string | null } = {},
) => {
	process.env.SOCIAL_PRICES_URL = 'https://app.example/';

	const graph: any = {
		buildAuthUrl: jest.fn().mockReturnValue('https://facebook.example/dialog'),
		exchangeCode: jest.fn().mockResolvedValue('USER_SHORT'),
		extendToken: jest.fn().mockResolvedValue('USER_LONG'),
		listPages: jest.fn().mockResolvedValue(opts.pages ?? [PAGE]),
		getPermissions: jest.fn().mockResolvedValue({
			granted: ['pages_show_list', 'pages_messaging', 'pages_manage_metadata'],
			declined: [],
		}),
		subscribePage: jest.fn().mockResolvedValue(undefined),
		unsubscribePage: jest.fn().mockResolvedValue(undefined),
	};
	const oauthState: any = {
		sign: jest.fn().mockResolvedValue('SIGNED'),
		verify: jest
			.fn()
			.mockResolvedValue({ ownerUserId: 'u1', employeeId: null }),
	};
	const connections: any = {
		findByOwner: jest.fn().mockResolvedValue(null),
		findWithToken: jest.fn().mockResolvedValue(null),
		findByPageId: jest
			.fn()
			.mockResolvedValue(
				opts.pageOwner ? { ownerUserId: opts.pageOwner } : null,
			),
		readToken: jest.fn().mockReturnValue('PAGE_TOKEN'),
		saveConnected: jest.fn().mockResolvedValue({ _id: 'c1' }),
		savePending: jest.fn().mockResolvedValue(undefined),
		findPending: jest.fn().mockResolvedValue(PAGE),
		listPending: jest.fn().mockResolvedValue([]),
		deleteByOwner: jest.fn().mockResolvedValue(undefined),
	};
	const users: any = {
		findOneById: jest.fn().mockResolvedValue({
			enabledApps: opts.enabledApps ?? [AppsEnum.App.FACEBOOK],
		}),
	};

	return {
		graph,
		oauthState,
		connections,
		users,
		service: new MessengerService(
			graph,
			oauthState,
			connections,
			users,
			{} as any,
			{} as any,
			{} as any,
			{} as any,
			{ notifyInboxUpdated: jest.fn() } as any,
		),
	};
};

describe('MessengerService', () => {
	describe('getConnectUrl', () => {
		it('sends the user to Facebook with a state that says who started it', async () => {
			const { service, oauthState, graph } = build();

			await expect(
				service.getConnectUrl({ ownerUserId: 'u1', employeeId: 'e1' } as any),
			).resolves.toBe('https://facebook.example/dialog');

			expect(oauthState.sign).toHaveBeenCalledWith({
				ownerUserId: 'u1',
				employeeId: 'e1',
			});
			expect(graph.buildAuthUrl).toHaveBeenCalledWith('SIGNED');
		});
	});

	describe('handleCallback', () => {
		it('with a single Page connects it straight away and subscribes to its messages', async () => {
			const { service, graph, connections } = build();

			const result = await service.handleCallback({ code: 'C', state: 'S' });

			expect(graph.exchangeCode).toHaveBeenCalledWith('C');
			expect(graph.extendToken).toHaveBeenCalledWith('USER_SHORT');
			expect(graph.listPages).toHaveBeenCalledWith('USER_LONG');
			expect(graph.subscribePage).toHaveBeenCalledWith('123', 'PAGE_TOKEN');
			expect(connections.saveConnected).toHaveBeenCalledWith('u1', PAGE);
			expect(result).toEqual({
				redirectTo: 'https://app.example/apps/messenger',
			});
		});

		it('with several Pages keeps them to choose from and asks the page to show the choice', async () => {
			const pages = [PAGE, { id: '456', name: 'Outra', accessToken: 'T2' }];
			const { service, connections, graph } = build({ pages });

			const result = await service.handleCallback({ code: 'C', state: 'S' });

			expect(connections.savePending).toHaveBeenCalledWith('u1', pages);
			expect(connections.saveConnected).not.toHaveBeenCalled();
			expect(graph.subscribePage).not.toHaveBeenCalled();
			expect(result.redirectTo).toBe(
				'https://app.example/apps/messenger?select=1',
			);
		});

		it.each([
			[{ error: 'access_denied', state: 'S' }, 'access_denied'],
			[{ error: 'server_error', state: 'S' }, 'oauth_error'],
			[{ state: 'S' }, 'missing_code'],
		])('turns %p into the code %s, never throwing', async (params, code) => {
			const { service } = build();

			const result = await service.handleCallback(params as any);

			expect(result.redirectTo).toBe(
				`https://app.example/apps/messenger?error=${code}`,
			);
		});

		it('refuses a state that does not verify', async () => {
			const { service, oauthState, graph } = build();
			oauthState.verify.mockRejectedValue(new Error('bad'));

			const result = await service.handleCallback({ code: 'C', state: 'x' });

			expect(result.redirectTo).toContain('error=invalid_state');
			expect(graph.exchangeCode).not.toHaveBeenCalled();
		});

		it('refuses a user who does not have the app enabled', async () => {
			const { service, graph } = build({ enabledApps: [] });

			const result = await service.handleCallback({ code: 'C', state: 'S' });

			expect(result.redirectTo).toContain('error=not_enabled');
			expect(graph.exchangeCode).not.toHaveBeenCalled();
		});

		it('says so when the user manages no Page, or picked none on the Facebook screen', async () => {
			const { service } = build({ pages: [] });

			const result = await service.handleCallback({ code: 'C', state: 'S' });

			expect(result.redirectTo).toContain('error=no_pages');
		});

		it('says which permission is missing when no Page came back because it was declined', async () => {
			const { service, graph } = build({ pages: [] });
			graph.getPermissions.mockResolvedValue({
				granted: ['public_profile'],
				declined: ['pages_show_list', 'pages_messaging'],
			});

			const result = await service.handleCallback({ code: 'C', state: 'S' });

			expect(result.redirectTo).toContain('error=missing_permission');
		});

		it('still says no_pages when the permissions cannot be read', async () => {
			const { service, graph } = build({ pages: [] });
			graph.getPermissions.mockRejectedValue(new MetaApiError(0, null, 'down'));

			const result = await service.handleCallback({ code: 'C', state: 'S' });

			expect(result.redirectTo).toContain('error=no_pages');
		});

		it('says so when the Page belongs to another account', async () => {
			const { service, connections } = build({ pageOwner: 'someone-else' });

			const result = await service.handleCallback({ code: 'C', state: 'S' });

			expect(result.redirectTo).toContain('error=page_in_use');
			expect(connections.saveConnected).not.toHaveBeenCalled();
		});

		it('says so when Facebook will not let the app receive the Page messages', async () => {
			const { service, graph, connections } = build();
			graph.subscribePage.mockRejectedValue(
				new MetaApiError(400, 200, 'no permission'),
			);

			const result = await service.handleCallback({ code: 'C', state: 'S' });

			expect(result.redirectTo).toContain('error=subscribe_failed');
			expect(connections.saveConnected).not.toHaveBeenCalled();
		});

		it('any other failure is a short code, not an error page', async () => {
			const { service, graph } = build();
			graph.exchangeCode.mockRejectedValue(new MetaApiError(0, null, 'down'));

			const result = await service.handleCallback({ code: 'C', state: 'S' });

			expect(result.redirectTo).toContain('error=connection_failed');
		});
	});

	describe('getConnection', () => {
		it('shows the Page and, while the user still has to pick one, the choices', async () => {
			const { service, connections } = build();
			connections.findByOwner.mockResolvedValue({
				status: AppsEnum.ConnectionStatus.CONNECTED,
				pageId: '123',
				pageName: 'Loja',
				connectedAt: new Date('2030-01-01'),
				lastUpdateAt: null,
			});

			await expect(service.getConnection('u1')).resolves.toEqual({
				connected: true,
				pageId: '123',
				pageName: 'Loja',
				connectedAt: new Date('2030-01-01'),
				lastUpdateAt: null,
				pendingPages: [],
			});
		});

		it('is not connected with only choices pending', async () => {
			const { service, connections } = build();
			connections.findByOwner.mockResolvedValue({
				pendingExpiresAt: new Date(),
			});
			connections.listPending.mockResolvedValue([
				{ pageId: '1', pageName: 'A' },
			]);

			await expect(service.getConnection('u1')).resolves.toMatchObject({
				connected: false,
				pageId: null,
				pendingPages: [{ pageId: '1', pageName: 'A' }],
			});
		});

		it('is not connected with nothing at all', async () => {
			const { service } = build();

			await expect(service.getConnection('u1')).resolves.toMatchObject({
				connected: false,
				pendingPages: [],
			});
		});
	});

	describe('selectPage', () => {
		it('connects the Page that was picked from the list', async () => {
			const { service, graph, connections } = build();

			await service.selectPage(CTX, '123');

			expect(connections.findPending).toHaveBeenCalledWith('u1', '123');
			expect(graph.subscribePage).toHaveBeenCalledWith('123', 'PAGE_TOKEN');
			expect(connections.saveConnected).toHaveBeenCalledWith('u1', PAGE);
		});

		it('refuses a Page that was not on the list, or whose list timed out', async () => {
			const { service, connections } = build();
			connections.findPending.mockResolvedValue(null);

			await expect(service.selectPage(CTX, '999')).rejects.toBeInstanceOf(
				MessengerPageNotAvailableException,
			);
		});

		it('refuses a Page that belongs to another account', async () => {
			const { service } = build({ pageOwner: 'someone-else' });

			await expect(service.selectPage(CTX, '123')).rejects.toBeInstanceOf(
				MessengerPageAlreadyConnectedException,
			);
		});

		it('explains when Facebook refuses the subscription', async () => {
			const { service, graph } = build();
			graph.subscribePage.mockRejectedValue(
				new MetaApiError(400, 200, 'no permission'),
			);

			const error = await service.selectPage(CTX, '123').catch((e) => e);

			expect(error).toBeInstanceOf(MessengerPageSubscribeFailedException);
			expect(JSON.stringify(error.getResponse())).toContain('no permission');
		});
	});

	describe('disconnect', () => {
		it('stops the messages of the Page, then forgets the connection', async () => {
			const { service, graph, connections } = build();
			connections.findWithToken.mockResolvedValue({
				pageId: '123',
				token: 'ENC',
			});

			await service.disconnect(CTX);

			expect(graph.unsubscribePage).toHaveBeenCalledWith('123', 'PAGE_TOKEN');
			expect(connections.deleteByOwner).toHaveBeenCalledWith('u1');
		});

		it('still forgets it when Facebook cannot be reached', async () => {
			const { service, graph, connections } = build();
			connections.findWithToken.mockResolvedValue({
				pageId: '123',
				token: 'ENC',
			});
			graph.unsubscribePage.mockRejectedValue(
				new MetaApiError(0, null, 'down'),
			);

			await service.disconnect(CTX);

			expect(connections.deleteByOwner).toHaveBeenCalledWith('u1');
		});

		it('also clears a login that never got to pick a Page', async () => {
			const { service, graph, connections } = build();

			await service.disconnect(CTX);

			expect(graph.unsubscribePage).not.toHaveBeenCalled();
			expect(connections.deleteByOwner).toHaveBeenCalledWith('u1');
		});
	});
});
