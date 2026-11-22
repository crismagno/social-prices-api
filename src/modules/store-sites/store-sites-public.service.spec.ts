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
		{ findPublishedBySlug: jest.fn().mockResolvedValue(published) } as any,
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
				isAvailable: true,
			});
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

		it('describes the store with public facts only', async () => {
			const { store } = await build().findBySlugOrFail('atelie');

			expect(store).toEqual({
				name: 'Ateliê',
				logo: 'logo.png',
				description: 'd',
				about: 'a',
			});
		});
	});
});
