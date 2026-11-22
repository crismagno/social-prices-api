import AppsEnum from '../apps/interfaces/apps.enum';
import { StoreSitesStatusProvider } from './store-sites.status.provider';

const build = (site: any) =>
	new StoreSitesStatusProvider({
		findPublishedByOwner: jest.fn().mockResolvedValue(site),
	} as any);

describe('StoreSitesStatusProvider', () => {
	it('answers for the site app', () => {
		expect(build(null).appId).toBe(AppsEnum.App.SITE);
	});

	it('is not connected without a published site', async () => {
		await expect(build(null).getStatus('u1')).resolves.toEqual({
			connected: false,
			status: null,
			accountLabel: null,
		});
	});

	it('is connected with a published site, labelled by its address', async () => {
		await expect(
			build({ slug: 'minha-loja' }).getStatus('u1'),
		).resolves.toEqual({
			connected: true,
			status: AppsEnum.ConnectionStatus.CONNECTED,
			accountLabel: 'minha-loja',
		});
	});
});
