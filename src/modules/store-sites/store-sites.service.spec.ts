import {
	BadRequestException,
	ConflictException,
	NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';

import SaveStoreSiteDto from './interfaces/dto/saveStoreSite.dto';
import StoreSitesEnum from './interfaces/store-sites.enum';
import { StoreSitesService } from './store-sites.service';

const OWNER = new Types.ObjectId().toString();
const STORE = new Types.ObjectId().toString();
const PRODUCT = new Types.ObjectId().toString();

const dto = (patch: Partial<SaveStoreSiteDto> = {}): SaveStoreSiteDto => ({
	slug: 'Minha-Loja',
	templateId: StoreSitesEnum.Template.ATELIER,
	theme: {
		primary: '#b5838d',
		secondary: '#fde2e4',
		accent: '#dfe7fd',
		background: '#fdf7f2',
		text: '#5a4a52',
	},
	hero: {
		tagline: null,
		title: 'Feito à mão',
		subtitle: null,
		backgroundImageUrl: null,
		featuredImageUrl: null,
		ctaLabel: null,
	},
	displayName: '  Ateliê da Mari ',
	sections: [],
	marquee: { isActive: false, items: [] },
	productIds: [PRODUCT],
	...patch,
});

const build = ({
	existing = null,
	slugOwner = null,
	store = { _id: STORE, userId: OWNER, softDelete: null },
	products = [{ _id: PRODUCT, userId: OWNER, storeIds: [STORE] }],
}: any = {}) => {
	const storeSiteModel: any = {
		findOne: jest.fn((filter: any) =>
			Promise.resolve(filter.slug ? slugOwner : existing),
		),
		findOneAndUpdate: jest.fn((_filter: any, update: any) =>
			Promise.resolve({ ...(existing ?? {}), ...update.$set }),
		),
	};
	const storesService: any = { findById: jest.fn().mockResolvedValue(store) };
	const productsService: any = {
		findByIds: jest.fn().mockResolvedValue(products),
	};

	return {
		storeSiteModel,
		service: new StoreSitesService(
			storeSiteModel,
			storesService,
			productsService,
		),
	};
};

describe('StoreSitesService', () => {
	describe('save', () => {
		it('upserts the site of the store with the owner and a lowercase slug', async () => {
			const { service, storeSiteModel } = build();

			await service.save(OWNER, STORE, dto());

			const [filter, update, options] =
				storeSiteModel.findOneAndUpdate.mock.calls[0];

			expect(String(filter.storeId)).toBe(STORE);
			expect(update.$set.slug).toBe('minha-loja');
			expect(String(update.$set.userId)).toBe(OWNER);
			expect(options).toMatchObject({ upsert: true, new: true });
		});

		it('keeps the name shown at the top of the site, trimmed', async () => {
			const { service, storeSiteModel } = build();

			await service.save(OWNER, STORE, dto());

			expect(
				storeSiteModel.findOneAndUpdate.mock.calls[0][1].$set.displayName,
			).toBe('Ateliê da Mari');
		});

		it('keeps no name when none is sent, so the site shows the store one', async () => {
			const { service, storeSiteModel } = build();

			await service.save(OWNER, STORE, dto({ displayName: undefined }));

			expect(
				storeSiteModel.findOneAndUpdate.mock.calls[0][1].$set.displayName,
			).toBeNull();
		});

		it('keeps an emptied name empty, so the top of the site shows none', async () => {
			const { service, storeSiteModel } = build();

			await service.save(OWNER, STORE, dto({ displayName: '   ' }));

			expect(
				storeSiteModel.findOneAndUpdate.mock.calls[0][1].$set.displayName,
			).toBe('');
		});

		it('stores the sizes checked, never as they were sent', async () => {
			const { service, storeSiteModel } = build();

			await service.save(
				OWNER,
				STORE,
				dto({ sizes: { logoWidth: 99999, heroTitleSize: 'x', hack: 1 } }),
			);

			const sizes: any =
				storeSiteModel.findOneAndUpdate.mock.calls[0][1].$set.sizes;

			expect(sizes.logoWidth).toBe(1600);
			expect(sizes.heroTitleSize).toBeNull();
			expect(sizes).not.toHaveProperty('hack');
		});

		it('stores the footer checked: a link that is not safe never gets in', async () => {
			const { service, storeSiteModel } = build();

			await service.save(
				OWNER,
				STORE,
				dto({
					footer: {
						text: 'Oi',
						links: [
							{
								key: 'x',
								type: 'WEBSITE',
								label: 'x',
								url: 'javascript:alert(1)',
							},
							{
								key: 'i',
								type: 'INSTAGRAM',
								label: '',
								url: 'instagram.com/a',
							},
						],
					},
				}),
			);

			const footer: any =
				storeSiteModel.findOneAndUpdate.mock.calls[0][1].$set.footer;

			expect(footer.links).toEqual([
				{
					key: 'i',
					type: 'INSTAGRAM',
					label: '',
					url: 'https://instagram.com/a',
					section: 'links',
				},
			]);
			expect(footer).toMatchObject({
				isActive: true,
				isLoginVisible: true,
				text: 'Oi',
			});
		});

		it('stores the extra backgrounds of the entrance checked', async () => {
			const { service, storeSiteModel } = build();

			await service.save(
				OWNER,
				STORE,
				dto({
					hero: {
						...dto().hero,
						backgroundImageUrl: 'a.png',
						backgroundImageUrls: ['b.png', 'a.png', ''],
						slideSeconds: 4,
					},
				}),
			);

			expect(
				storeSiteModel.findOneAndUpdate.mock.calls[0][1].$set.hero,
			).toMatchObject({
				backgroundImageUrl: 'a.png',
				backgroundImageUrls: ['b.png'],
				slideSeconds: 4,
			});
		});

		it('stores the sign-in button checked', async () => {
			const { service, storeSiteModel } = build();

			await service.save(
				OWNER,
				STORE,
				dto({ signIn: { label: ' Entrar ', destination: 'nowhere' } }),
			);

			expect(
				storeSiteModel.findOneAndUpdate.mock.calls[0][1].$set.signIn,
			).toEqual({
				isVisible: true,
				label: 'Entrar',
				destination: 'STORE_CHAT',
			});
		});

		it('stores the about section checked: only known video players get in', async () => {
			const { service, storeSiteModel } = build();

			await service.save(
				OWNER,
				STORE,
				dto({
					about: {
						title: 'Nossa história',
						texts: ['Oi', ''],
						media: { type: 'EMBED', url: 'https://evil.com/v' },
					},
				}),
			);

			expect(
				storeSiteModel.findOneAndUpdate.mock.calls[0][1].$set.about,
			).toEqual({
				isActive: true,
				title: 'Nossa história',
				texts: ['Oi'],
				media: null,
				mediaPosition: 'LEFT',
			});
		});

		it('stores the pages checked, without bringing back ready ones removed', async () => {
			const { service, storeSiteModel } = build();

			await service.save(
				OWNER,
				STORE,
				dto({
					pages: [
						{
							key: 'c',
							type: 'CUSTOM',
							slug: 'Encomendas',
							label: 'Encomendas',
						},
					],
				}),
			);

			const pages: any[] =
				storeSiteModel.findOneAndUpdate.mock.calls[0][1].$set.pages;

			expect(pages.map((page) => [page.type, page.slug])).toEqual([
				['CUSTOM', 'encomendas'],
			]);
		});

		it('refuses a store of another owner', async () => {
			const { service } = build({
				store: { _id: STORE, userId: new Types.ObjectId().toString() },
			});

			await expect(service.save(OWNER, STORE, dto())).rejects.toBeInstanceOf(
				NotFoundException,
			);
		});

		it('refuses a deleted store', async () => {
			const { service } = build({
				store: { _id: STORE, userId: OWNER, softDelete: { isDeleted: true } },
			});

			await expect(service.save(OWNER, STORE, dto())).rejects.toBeInstanceOf(
				NotFoundException,
			);
		});

		it('refuses a slug taken by another store', async () => {
			const { service } = build({
				slugOwner: { storeId: new Types.ObjectId().toString() },
			});

			const error: any = await service
				.save(OWNER, STORE, dto())
				.catch((caught: unknown) => caught);

			expect(error).toBeInstanceOf(ConflictException);
			expect(error.getResponse().code).toBe('STORE_SITE_SLUG_TAKEN');
		});

		it('answers a slug taken in the same instant as a taken slug', async () => {
			const { service, storeSiteModel } = build();

			storeSiteModel.findOneAndUpdate.mockRejectedValue({ code: 11000 });

			const error: any = await service
				.save(OWNER, STORE, dto())
				.catch((caught: unknown) => caught);

			expect(error).toBeInstanceOf(ConflictException);
			expect(error.getResponse().code).toBe('STORE_SITE_SLUG_TAKEN');
		});

		it('accepts its own slug again', async () => {
			const { service } = build({ slugOwner: { storeId: STORE } });

			await expect(service.save(OWNER, STORE, dto())).resolves.toBeDefined();
		});

		it('refuses a product of another owner', async () => {
			const { service } = build({
				products: [{ _id: PRODUCT, userId: 'someone', storeIds: [STORE] }],
			});

			await expect(service.save(OWNER, STORE, dto())).rejects.toBeInstanceOf(
				BadRequestException,
			);
		});

		it('refuses a product that is not sold by the store', async () => {
			const { service } = build({
				products: [{ _id: PRODUCT, userId: OWNER, storeIds: [] }],
			});

			await expect(service.save(OWNER, STORE, dto())).rejects.toBeInstanceOf(
				BadRequestException,
			);
		});

		it('refuses a product that does not exist', async () => {
			const { service } = build({ products: [] });

			await expect(service.save(OWNER, STORE, dto())).rejects.toBeInstanceOf(
				BadRequestException,
			);
		});

		it('never touches the published state', async () => {
			const { service, storeSiteModel } = build({
				existing: { isPublished: true, publishedAt: new Date() },
			});

			await service.save(OWNER, STORE, dto());

			const update: any = storeSiteModel.findOneAndUpdate.mock.calls[0][1];

			expect(update.$set).not.toHaveProperty('isPublished');
			expect(update.$set).not.toHaveProperty('publishedAt');
			expect(update.$setOnInsert).toMatchObject({
				isPublished: false,
				publishedAt: null,
			});
		});
	});

	describe('setPublished', () => {
		it('publishes with the date', async () => {
			const { service, storeSiteModel } = build({ existing: { slug: 'x' } });

			await service.setPublished(OWNER, STORE, true);

			const update: any = storeSiteModel.findOneAndUpdate.mock.calls[0][1];

			expect(update.$set.isPublished).toBe(true);
			expect(update.$set.publishedAt).toBeInstanceOf(Date);
		});

		it('refuses when nothing was saved yet', async () => {
			const { service } = build();

			await expect(
				service.setPublished(OWNER, STORE, true),
			).rejects.toBeInstanceOf(NotFoundException);
		});
	});

	describe('findByStoreId', () => {
		it('hides the site of a store of another owner', async () => {
			const { service } = build({
				existing: { slug: 'x' },
				store: { _id: STORE, userId: 'someone' },
			});

			await expect(service.findByStoreId(OWNER, STORE)).resolves.toBeNull();
		});
	});
});
