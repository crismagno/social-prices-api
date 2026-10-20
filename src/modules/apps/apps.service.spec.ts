import AppsEnum from './interfaces/apps.enum';
import { AppsService } from './apps.service';

const googleProvider = (status: any = null) => ({
	appId: AppsEnum.App.GOOGLE_CONTACTS,
	getStatus: jest
		.fn()
		.mockResolvedValue(
			status ?? { connected: false, status: null, accountLabel: null },
		),
});

const build = (opts: { enabledApps?: any; providers?: any[] } = {}) => {
	const usersService: any = {
		findOneByIdOrFail: jest
			.fn()
			.mockResolvedValue({ _id: 'u1', enabledApps: opts.enabledApps }),
	};

	return new AppsService(usersService, opts.providers ?? []);
};

describe('AppsService.getCatalog', () => {
	it('lists every app with its enabled / integrated / connected facts', async () => {
		const service = build({
			enabledApps: [AppsEnum.App.GOOGLE_CONTACTS, AppsEnum.App.TELEGRAM],
			providers: [
				googleProvider({
					connected: true,
					status: AppsEnum.ConnectionStatus.CONNECTED,
					accountLabel: 'me@example.com',
				}),
			],
		});

		const catalog = await service.getCatalog('u1');

		expect(catalog.map((item) => item.id)).toEqual(Object.values(AppsEnum.App));

		expect(catalog.find((i) => i.id === AppsEnum.App.GOOGLE_CONTACTS)).toEqual({
			id: AppsEnum.App.GOOGLE_CONTACTS,
			enabled: true,
			integrated: true,
			connected: true,
			status: AppsEnum.ConnectionStatus.CONNECTED,
			accountLabel: 'me@example.com',
			unreadCount: 0,
		});

		// enabled by the manager, but no integration of its own yet
		expect(catalog.find((i) => i.id === AppsEnum.App.TELEGRAM)).toEqual({
			id: AppsEnum.App.TELEGRAM,
			enabled: true,
			integrated: false,
			connected: false,
			status: null,
			accountLabel: null,
			unreadCount: 0,
		});

		expect(catalog.find((i) => i.id === AppsEnum.App.INSTAGRAM).enabled).toBe(
			false,
		);
	});

	it('carries how many messages are unread for an app that has an inbox', async () => {
		const service = build({
			enabledApps: [AppsEnum.App.GOOGLE_CONTACTS],
			providers: [
				googleProvider({
					connected: true,
					status: AppsEnum.ConnectionStatus.CONNECTED,
					accountLabel: 'Loja',
					unreadCount: 7,
				}),
			],
		});

		const google = (await service.getCatalog('u1')).find(
			(i) => i.id === AppsEnum.App.GOOGLE_CONTACTS,
		);

		expect(google.unreadCount).toBe(7);
	});

	it('reports no unread messages for an app the manager did not enable', async () => {
		const service = build({
			enabledApps: [],
			providers: [
				googleProvider({
					connected: true,
					status: AppsEnum.ConnectionStatus.CONNECTED,
					accountLabel: 'Loja',
					unreadCount: 7,
				}),
			],
		});

		const google = (await service.getCatalog('u1')).find(
			(i) => i.id === AppsEnum.App.GOOGLE_CONTACTS,
		);

		expect(google).toMatchObject({ enabled: false, unreadCount: 0 });
	});

	it('only apps that bring a status provider are integrated', async () => {
		const catalog = await build({ providers: [googleProvider()] }).getCatalog(
			'u1',
		);

		expect(catalog.filter((i) => i.integrated).map((i) => i.id)).toEqual([
			AppsEnum.App.GOOGLE_CONTACTS,
		]);
	});

	it('asks each provider about this owner, and only the app it belongs to', async () => {
		const provider = googleProvider();

		await build({ providers: [provider] }).getCatalog('u1');

		expect(provider.getStatus).toHaveBeenCalledTimes(1);
		expect(provider.getStatus).toHaveBeenCalledWith('u1');
	});

	it('exposes an EXPIRED connection as not connected, with its status', async () => {
		const service = build({
			enabledApps: [AppsEnum.App.GOOGLE_CONTACTS],
			providers: [
				googleProvider({
					connected: false,
					status: AppsEnum.ConnectionStatus.EXPIRED,
					accountLabel: 'me@example.com',
				}),
			],
		});

		const google = (await service.getCatalog('u1')).find(
			(i) => i.id === AppsEnum.App.GOOGLE_CONTACTS,
		);

		expect(google).toMatchObject({
			connected: false,
			status: AppsEnum.ConnectionStatus.EXPIRED,
		});
	});

	it('handles a user that has no enabledApps field at all', async () => {
		const catalog = await build({ enabledApps: undefined }).getCatalog('u1');

		expect(catalog.every((item) => item.enabled === false)).toBe(true);
	});
});
