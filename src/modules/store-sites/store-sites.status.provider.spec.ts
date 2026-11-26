import InboxEnum from '../inbox/interfaces/inbox.enum';
import AppsEnum from '../apps/interfaces/apps.enum';
import { StoreSitesStatusProvider } from './store-sites.status.provider';

const build = (site: any, unread: number = 0) =>
	new StoreSitesStatusProvider(
		{ findPublishedByOwner: jest.fn().mockResolvedValue(site) } as any,
		{ countUnread: jest.fn().mockResolvedValue(unread) } as any,
	);

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
			unreadCount: 0,
		});
	});

	it('counts the messages of the site chat waiting to be read', async () => {
		const conversations = { countUnread: jest.fn().mockResolvedValue(3) };
		const provider = new StoreSitesStatusProvider(
			{
				findPublishedByOwner: jest.fn().mockResolvedValue({ slug: 'loja' }),
			} as any,
			conversations as any,
		);

		await expect(provider.getStatus('u1')).resolves.toMatchObject({
			unreadCount: 3,
		});
		expect(conversations.countUnread).toHaveBeenCalledWith(
			'u1',
			InboxEnum.Channel.SITE,
		);
	});
});
