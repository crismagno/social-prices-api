import { AppSyncNotSupportedException } from './apps.exceptions';
import { AppsRegistry } from './apps.registry';
import { AppsService } from './apps.service';
import AppsEnum from './interfaces/apps.enum';

const CTX = { ownerUserId: 'u1', employeeId: null };

const build = (
	opts: { enabledApps?: any; connections?: any[]; integration?: any } = {},
) => {
	const usersService: any = {
		findOneByIdOrFail: jest
			.fn()
			.mockResolvedValue({ _id: 'u1', enabledApps: opts.enabledApps }),
	};
	const connectionsService: any = {
		findByOwner: jest.fn().mockResolvedValue(opts.connections ?? []),
	};
	const integration = opts.integration ?? {
		appId: AppsEnum.App.GOOGLE_CONTACTS,
		getConnectUrl: jest.fn().mockResolvedValue('https://google/auth'),
		handleCallback: jest.fn().mockResolvedValue({ redirectTo: '/apps' }),
		disconnect: jest.fn().mockResolvedValue(undefined),
		sync: jest.fn().mockResolvedValue({ contacts: [], hasMore: false }),
		importSelected: jest.fn().mockResolvedValue({ created: 1 }),
	};
	const registry = new AppsRegistry([integration]);

	return {
		integration,
		service: new AppsService(usersService, connectionsService, registry),
	};
};

describe('AppsService', () => {
	describe('getCatalog', () => {
		it('lists every app with enabled / integrated / connected flags', async () => {
			const { service } = build({
				enabledApps: [AppsEnum.App.GOOGLE_CONTACTS, AppsEnum.App.TELEGRAM],
				connections: [
					{
						appId: AppsEnum.App.GOOGLE_CONTACTS,
						status: AppsEnum.ConnectionStatus.CONNECTED,
						accountLabel: 'me@example.com',
						lastSyncAt: null,
						lastSyncSummary: null,
					},
				],
			});

			const catalog = await service.getCatalog('u1');

			expect(catalog.map((item) => item.id)).toEqual(
				Object.values(AppsEnum.App),
			);

			const google = catalog.find((i) => i.id === AppsEnum.App.GOOGLE_CONTACTS);
			expect(google).toMatchObject({
				enabled: true,
				integrated: true,
				connected: true,
				accountLabel: 'me@example.com',
			});

			const telegram = catalog.find((i) => i.id === AppsEnum.App.TELEGRAM);
			expect(telegram).toMatchObject({
				enabled: true,
				integrated: false,
				connected: false,
				status: null,
			});

			const instagram = catalog.find((i) => i.id === AppsEnum.App.INSTAGRAM);
			expect(instagram.enabled).toBe(false);
		});

		it('treats an EXPIRED connection as not connected but exposes its status', async () => {
			const { service } = build({
				enabledApps: [AppsEnum.App.GOOGLE_CONTACTS],
				connections: [
					{
						appId: AppsEnum.App.GOOGLE_CONTACTS,
						status: AppsEnum.ConnectionStatus.EXPIRED,
					},
				],
			});

			const google = (await service.getCatalog('u1')).find(
				(i) => i.id === AppsEnum.App.GOOGLE_CONTACTS,
			);

			expect(google.connected).toBe(false);
			expect(google.status).toBe(AppsEnum.ConnectionStatus.EXPIRED);
		});

		it('handles a user that has no enabledApps field at all', async () => {
			const { service } = build({ enabledApps: undefined });

			const catalog = await service.getCatalog('u1');

			expect(catalog.every((item) => item.enabled === false)).toBe(true);
		});
	});

	it('connect wraps the integration url', async () => {
		const { service } = build();

		await expect(
			service.connect(AppsEnum.App.GOOGLE_CONTACTS, CTX),
		).resolves.toEqual({ url: 'https://google/auth' });
	});

	it('sync delegates to the integration', async () => {
		const { service, integration } = build();

		await service.sync(AppsEnum.App.GOOGLE_CONTACTS, CTX);

		expect(integration.sync).toHaveBeenCalledWith(CTX);
	});

	it('importSelected delegates to the integration with the ids', async () => {
		const { service, integration } = build();

		await expect(
			service.importSelected(AppsEnum.App.GOOGLE_CONTACTS, CTX, ['people/c1']),
		).resolves.toEqual({ created: 1 });
		expect(integration.importSelected).toHaveBeenCalledWith(CTX, ['people/c1']);
	});

	it('importSelected refuses an integration without import support', async () => {
		const { service } = build({
			integration: {
				appId: AppsEnum.App.GOOGLE_CONTACTS,
				getConnectUrl: jest.fn(),
				handleCallback: jest.fn(),
				disconnect: jest.fn(),
			},
		});

		await expect(
			service.importSelected(AppsEnum.App.GOOGLE_CONTACTS, CTX, ['people/c1']),
		).rejects.toBeInstanceOf(AppSyncNotSupportedException);
	});

	it('sync refuses an integration without sync support', async () => {
		const { service } = build({
			integration: {
				appId: AppsEnum.App.GOOGLE_CONTACTS,
				getConnectUrl: jest.fn(),
				handleCallback: jest.fn(),
				disconnect: jest.fn(),
			},
		});

		await expect(
			service.sync(AppsEnum.App.GOOGLE_CONTACTS, CTX),
		).rejects.toBeInstanceOf(AppSyncNotSupportedException);
	});
});
