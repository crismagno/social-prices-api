import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

import AppsEnum from '../apps/interfaces/apps.enum';
import StoresEnum from '../stores/interfaces/stores.enum';
import { StoreSitesPublicService } from './store-sites-public.service';

const OWNER = new Types.ObjectId().toString();
const STORE = new Types.ObjectId().toString();
const P1 = new Types.ObjectId().toString();
const P2 = new Types.ObjectId().toString();
const P3 = new Types.ObjectId().toString();

const product = (_id: string, patch: any = {}) => ({
	_id,
	name: `Produto ${_id.slice(-3)}`,
	description: 'feito à mão',
	price: 999,
	quantity: 77,
	isActive: true,
	userId: OWNER,
	storeIds: [STORE],
	mainUrl: 'main.png',
	filesUrl: ['a.png'],
	barcode: 'BAR-PRODUCT',
	sku: 'SKU-PRODUCT',
	pricing: { cost: 1 },
	historicPrices: [{ price: 1 }],
	...patch,
});

const item = (productId: string, patch: any = {}) => ({
	_id: new Types.ObjectId().toString(),
	productId,
	isDefault: true,
	isActive: true,
	price: 50,
	quantity: 3,
	barcode: 'BAR-ITEM',
	sku: 'SKU-ITEM',
	pricing: { cost: 2 },
	...patch,
});

const build = ({
	site = {},
	owner = { _id: OWNER, enabledApps: [AppsEnum.App.SITE] },
	store = {
		_id: STORE,
		userId: OWNER,
		name: 'Ateliê',
		logo: 'logo.png',
		description: 'd',
		about: 'a',
		status: StoresEnum.Status.ACTIVE,
		softDelete: null,
		email: 'dona@x.com',
		cnpj: '123',
	},
	products = [product(P1), product(P2), product(P3)],
	items = [item(P1), item(P2), item(P3)],
}: any = {}) => {
	const published: any =
		site === null
			? null
			: {
					_id: new Types.ObjectId().toString(),
					userId: OWNER,
					storeId: STORE,
					slug: 'atelie',
					templateId: 'ATELIER',
					isPublished: true,
					publishedAt: new Date(),
					theme: {},
					hero: { title: 'Oi' },
					sections: [],
					marquee: { isActive: false, items: [] },
					productIds: [P1, P2, P3],
					...site,
			  };

	return new StoreSitesPublicService(
		{
			findPublishedBySlug: jest.fn().mockResolvedValue(published),
			findPublished: jest.fn().mockResolvedValue(published ? [published] : []),
			findPublishedByStoreId: jest.fn().mockResolvedValue(published),
		} as any,
		{ findOneById: jest.fn().mockResolvedValue(owner) } as any,
		{ findById: jest.fn().mockResolvedValue(store) } as any,
		{ findByIds: jest.fn().mockResolvedValue(products) } as any,
		{ findDefaultsByProductIds: jest.fn().mockResolvedValue(items) } as any,
	);
};

const notFound = (service: StoreSitesPublicService) =>
	expect(service.findBySlugOrFail('atelie')).rejects.toBeInstanceOf(
		NotFoundException,
	);

describe('StoreSitesPublicService', () => {
	describe('who may see the site', () => {
		it('refuses an unknown or unpublished address', () =>
			notFound(build({ site: null })));

		it('refuses when the owner lost the app', () =>
			notFound(build({ owner: { _id: OWNER, enabledApps: [] } })));

		it('refuses when the owner no longer exists', () =>
			notFound(build({ owner: null })));

		it('refuses when the store no longer exists', () =>
			notFound(build({ store: null })));

		it('refuses a deleted store', () =>
			notFound(
				build({
					store: {
						_id: STORE,
						userId: OWNER,
						status: StoresEnum.Status.ACTIVE,
						softDelete: { isDeleted: true },
					},
				}),
			));

		it('refuses a store that is not active', () =>
			notFound(
				build({
					store: {
						_id: STORE,
						userId: OWNER,
						status: StoresEnum.Status.INACTIVE,
						softDelete: null,
					},
				}),
			));
	});

	describe('what a visitor receives', () => {
		it('never leaks internal fields', async () => {
			const json: string = JSON.stringify(
				await build().findBySlugOrFail('atelie'),
			);

			for (const key of [
				'userId',
				'pricing',
				'quantity',
				'barcode',
				'historicPrices',
				'sku',
				'storeIds',
				'email',
				'cnpj',
			]) {
				expect(json).not.toMatch(new RegExp(`"${key}"`));
			}
		});

		it('prices by the default item, not by the product', async () => {
			const { products } = await build().findBySlugOrFail('atelie');

			expect(products[0]).toEqual({
				_id: P1,
				name: `Produto ${P1.slice(-3)}`,
				description: 'feito à mão',
				price: 50,
				mainUrl: 'main.png',
				filesUrl: ['a.png'],
				details: null,
				brand: null,
				colors: [],
				dimensions: null,
				isAvailable: true,
			});
		});

		it('tells what a visitor wants to know before buying: details, brand, colors and the measures that were filled', async () => {
			const { products } = await build({
				products: [
					product(P1, {
						details: '  Algodão cru.  ',
						brand: ' Ateliê ',
						colors: ['#ffffff', '', null, '#000000'],
						dimensions: {
							size: ' M ',
							height: 0.3,
							width: 0,
							length: null,
							weight: 1.2,
						},
					}),
				],
			}).findBySlugOrFail('atelie');

			expect(products[0]).toMatchObject({
				details: 'Algodão cru.',
				brand: 'Ateliê',
				colors: ['#ffffff', '#000000'],
				dimensions: { size: 'M', height: 0.3, weight: 1.2 },
			});
			expect(Object.keys(products[0].dimensions)).toEqual([
				'size',
				'height',
				'weight',
			]);
		});

		it('has no measures when none was filled', async () => {
			const { products } = await build({
				products: [
					product(P1, { dimensions: { size: '  ', height: null, width: 0 } }),
				],
			}).findBySlugOrFail('atelie');

			expect(products[0].dimensions).toBeNull();
		});

		it('keeps the order chosen for the site', async () => {
			const { products } = await build({
				site: { productIds: [P3, P1, P2] },
			}).findBySlugOrFail('atelie');

			expect(products.map((entry: any) => entry._id)).toEqual([P3, P1, P2]);
		});

		it('drops inactive, removed, foreign and item-less products', async () => {
			const { products } = await build({
				site: { productIds: [P1, P2, P3, new Types.ObjectId().toString()] },
				products: [
					product(P1, { isActive: false }),
					product(P2, { storeIds: [] }),
					product(P3),
				],
				items: [item(P1), item(P2)],
			}).findBySlugOrFail('atelie');

			expect(products).toEqual([]);
		});

		it('names only the products it shows', async () => {
			const { site, products } = await build({
				products: [product(P1, { isActive: false }), product(P2), product(P3)],
			}).findBySlugOrFail('atelie');

			expect(site.productIds.map(String)).toEqual([P2, P3]);
			expect(products).toHaveLength(2);
		});

		it('drops a product whose default item is inactive', async () => {
			const { products } = await build({
				items: [item(P1, { isActive: false }), item(P2), item(P3)],
			}).findBySlugOrFail('atelie');

			expect(products.map((entry: any) => entry._id)).toEqual([P2, P3]);
		});

		it('still lists a product out of stock, as unavailable', async () => {
			const { products } = await build({
				items: [item(P1, { quantity: 0 }), item(P2), item(P3)],
			}).findBySlugOrFail('atelie');

			expect(products[0]).toMatchObject({ _id: P1, isAvailable: false });
		});

		it('gives the name chosen for the site, and none for a site without one', async () => {
			const named = await build({
				site: { displayName: 'Ateliê da Mari' },
			}).findBySlugOrFail('atelie');

			expect(named.site.displayName).toBe('Ateliê da Mari');

			const unnamed = await build().findBySlugOrFail('atelie');

			expect(unnamed.site.displayName).toBeNull();
		});

		it('gives the sizes of the site, all empty for one saved before they existed', async () => {
			const sized = await build({
				site: { sizes: { logoWidth: 64, junk: 1 } },
			}).findBySlugOrFail('atelie');

			expect(sized.site.sizes.logoWidth).toBe(64);
			expect(sized.site.sizes).not.toHaveProperty('junk');

			const older = await build().findBySlugOrFail('atelie');

			expect(older.site.sizes.logoWidth).toBeNull();
		});

		it('gives the footer, with the name and the login button for a site saved before it existed', async () => {
			const { site } = await build().findBySlugOrFail('atelie');

			expect(site.footer.isActive).toBe(true);
			expect(site.footer.links.map((link) => link.type)).toEqual([
				'NAME',
				'SIGN_IN',
			]);
			expect(site.footer.sections).toHaveLength(2);
		});

		it('gives the backgrounds of the entrance, none extra for an older site', async () => {
			const older = await build().findBySlugOrFail('atelie');

			expect(older.site.hero).toMatchObject({
				backgroundImageUrls: [],
				slideSeconds: 6,
				featuredImageUrls: [],
				featuredSlideSeconds: 6,
			});

			const sliding = await build({
				site: {
					hero: {
						title: 'Oi',
						backgroundImageUrl: 'a.png',
						backgroundImageUrls: ['b.png', 'c.png'],
						slideSeconds: 9,
					},
				},
			}).findBySlugOrFail('atelie');

			expect(sliding.site.hero).toMatchObject({
				backgroundImageUrls: ['b.png', 'c.png'],
				slideSeconds: 9,
			});
		});

		it('gives the sign-in button, leading to the store for an older site', async () => {
			const { site } = await build().findBySlugOrFail('atelie');

			expect(site.signIn).toEqual({
				isVisible: true,
				label: null,
				destination: 'STORE_CHAT',
			});
			// The button needs the store to send the customer to it.
			expect(String(site.storeId)).toBe(STORE);
		});

		it('gives the about section, empty for an older site so the store text shows', async () => {
			const { site } = await build().findBySlugOrFail('atelie');

			expect(site.about).toEqual({
				isActive: true,
				title: null,
				texts: [],
				media: null,
				mediaPosition: 'LEFT',
			});
		});

		it('gives the pages, the ready ones for an older site', async () => {
			const { site } = await build().findBySlugOrFail('atelie');

			expect(site.pages.map((page) => page.slug)).toEqual([
				'produtos',
				'sobre',
				'suporte',
				'contato',
			]);
		});

		it('describes the store with public facts only', async () => {
			const { store } = await build().findBySlugOrFail('atelie');

			expect(store).toEqual({
				name: 'Ateliê',
				logo: 'logo.png',
				description: 'd',
				about: 'a',
			});
		});

		it('shows the logo of the store on a site saved before the logo was editable', async () => {
			const { site, store } = await build().findBySlugOrFail('atelie');

			expect(site.logo).toEqual({ isActive: true, imageUrl: null });
			expect(store.logo).toBe('logo.png');
		});

		it('shows the image chosen for the site instead of the logo of the store', async () => {
			const { store } = await build({
				site: { logo: { isActive: true, imageUrl: 'site-logo.png' } },
			}).findBySlugOrFail('atelie');

			expect(store.logo).toBe('site-logo.png');
		});

		it('shows no logo when it is switched off', async () => {
			const { store } = await build({
				site: { logo: { isActive: false, imageUrl: 'site-logo.png' } },
			}).findBySlugOrFail('atelie');

			expect(store.logo).toBeNull();
		});
	});

	describe('findOnlineSlugByStoreId', () => {
		it('gives the address of the site that is online', async () => {
			await expect(build().findOnlineSlugByStoreId(STORE)).resolves.toBe(
				'atelie',
			);
		});

		it('gives nothing when the store has no published site', async () => {
			await expect(
				build({ site: null }).findOnlineSlugByStoreId(STORE),
			).resolves.toBeNull();
		});

		it('gives nothing when the owner no longer has the site app', async () => {
			await expect(
				build({
					owner: { _id: OWNER, enabledApps: [] },
				}).findOnlineSlugByStoreId(STORE),
			).resolves.toBeNull();
		});

		it('gives nothing when the store is not active', async () => {
			await expect(
				build({
					store: { _id: STORE, status: StoresEnum.Status.INACTIVE },
				}).findOnlineSlugByStoreId(STORE),
			).resolves.toBeNull();
		});
	});

	describe('the list of sites that are online', () => {
		it('shows each site as a card: its name, its entrance and its address', async () => {
			const cards = await build({
				site: {
					displayName: ' Ateliê da Ana ',
					hero: {
						title: 'Feito à mão',
						subtitle: 'Peças únicas',
						backgroundImageUrl: 'bg.png',
					},
					theme: { primary: '#112233' },
				},
			}).findOnlineCards();

			expect(cards).toEqual([
				{
					slug: 'atelie',
					name: 'Ateliê da Ana',
					logo: 'logo.png',
					title: 'Feito à mão',
					subtitle: 'Peças únicas',
					imageUrl: 'bg.png',
					color: '#112233',
					sells: true,
				},
			]);
		});

		it('names a site with no name of its own after its store', async () => {
			const [card] = await build().findOnlineCards();

			expect(card.name).toBe('Ateliê');
			expect(card.imageUrl).toBeNull();
		});

		it('says when a site only shows and has no bag', async () => {
			const [card] = await build({
				site: { cartButton: { isVisible: false } },
			}).findOnlineCards();

			expect(card.sells).toBe(false);
		});

		it('leaves out a site whose owner lost the app', async () => {
			expect(
				await build({
					owner: { _id: OWNER, enabledApps: [] },
				}).findOnlineCards(),
			).toEqual([]);
		});

		it('finds by the name or the entrance, whatever the accents and the case', async () => {
			const service = build({ site: { hero: { title: 'Feito à mão' } } });

			expect(await service.findOnlineCards('ATELIE')).toHaveLength(1);
			expect(await service.findOnlineCards('a mao')).toHaveLength(1);
			expect(await service.findOnlineCards('padaria')).toEqual([]);
		});
	});
});
