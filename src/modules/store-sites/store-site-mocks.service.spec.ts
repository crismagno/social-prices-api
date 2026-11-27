import { NotFoundException } from '@nestjs/common';

import FeatureLimitsEnum from '../feature-limits/interfaces/feature-limits.enum';
import StoreSitesEnum from './interfaces/store-sites.enum';
import { StoreSiteMocksService } from './store-site-mocks.service';

const OWNER: string = '507f1f77bcf86cd799439011';
const STORE: string = '507f1f77bcf86cd799439012';
const MOCK: string = '507f1f77bcf86cd799439013';

const content = (): any => ({
	slug: 'minha-loja',
	templateId: StoreSitesEnum.Template.ATELIER,
	theme: {
		primary: '#111111',
		secondary: '#222222',
		accent: '#333333',
		background: '#ffffff',
		text: '#000000',
	},
	displayName: '  Loja  ',
	hero: { title: 'Olá' },
	sections: [],
	marquee: { isActive: false, items: [] },
	productIds: ['a', 'a', 'b'],
});

const build = (found: any = { _id: MOCK, userId: OWNER }) => {
	const query = (value: any) => ({
		select: jest.fn().mockReturnThis(),
		sort: jest.fn().mockReturnThis(),
		lean: jest.fn().mockResolvedValue(value),
	});

	const model: any = {
		find: jest.fn(() => query([])),
		findOne: jest.fn(() => query(found)),
		create: jest.fn(async (doc: any) => doc),
		findOneAndUpdate: jest.fn(async (_: any, update: any) => update.$set),
		deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
	};

	const sites: any = { assertOwnStore: jest.fn().mockResolvedValue(undefined) };

	const limits: any = {
		assertCanCreate: jest.fn().mockResolvedValue(undefined),
		usageOf: jest.fn().mockResolvedValue({ limit: 2, used: 1, enabled: true }),
	};

	return {
		service: new StoreSiteMocksService(model, sites, limits),
		model,
		sites,
		limits,
	};
};

describe('StoreSiteMocksService', () => {
	it('lists the mocks of the store with how many more fit', async () => {
		const { service, sites } = build();

		await expect(service.list(OWNER, STORE)).resolves.toEqual({
			mocks: [],
			limit: 2,
			used: 1,
		});
		expect(sites.assertOwnStore).toHaveBeenCalledWith(OWNER, STORE);
	});

	it('checks the limit before keeping a new mock', async () => {
		const { service, limits, model } = build();

		limits.assertCanCreate.mockRejectedValue(new Error('limit'));

		await expect(
			service.create(OWNER, STORE, { name: 'A', content: content() }),
		).rejects.toThrow('limit');
		expect(limits.assertCanCreate).toHaveBeenCalledWith(
			OWNER,
			FeatureLimitsEnum.Feature.SITE_MOCKS,
		);
		expect(model.create).not.toHaveBeenCalled();
	});

	it('keeps the content checked, without the address', async () => {
		const { service, model } = build();

		await service.create(OWNER, STORE, {
			name: '  Natal  ',
			content: content(),
		});

		const stored: any = model.create.mock.calls[0][0];

		expect(stored.name).toBe('Natal');
		expect(stored.templateId).toBe(StoreSitesEnum.Template.ATELIER);
		expect(stored.content.slug).toBeUndefined();
		expect(stored.content.displayName).toBe('Loja');
		expect(stored.content.productIds).toEqual(['a', 'b']);
	});

	it('renames without touching the content', async () => {
		const { service, model } = build();

		await service.update(OWNER, MOCK, { name: ' Novo ' });

		expect(model.findOneAndUpdate.mock.calls[0][1]).toEqual({
			$set: { name: 'Novo' },
		});
	});

	it('refuses a mock of someone else', async () => {
		const { service, model } = build(null);

		await expect(service.remove(OWNER, MOCK)).rejects.toBeInstanceOf(
			NotFoundException,
		);
		expect(model.deleteOne).not.toHaveBeenCalled();
	});
});
