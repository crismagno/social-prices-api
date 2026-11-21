import { NotFoundException } from '@nestjs/common';

import { StoreChatStoresService } from './store-chat-stores.service';

const BUYER = { userId: '507f1f77bcf86cd799439011', email: 'Ana@Example.com' };
const STORE_A = '507f1f77bcf86cd799439021';
const STORE_B = '507f1f77bcf86cd799439022';

const store = (over: any = {}): any => ({
	_id: STORE_A,
	name: 'Loja Central',
	logo: 'logo.png',
	description: 'Tudo',
	type: 'ONLINE',
	email: 'secret@store.com',
	cnpj: '00',
	phoneNumbers: [{ number: '1' }],
	addresses: [{ city: 'X' }],
	userId: '507f1f77bcf86cd799439099',
	status: 'ACTIVE',
	...over,
});

const build = (found: any[] = [], bought: string[] = []) => {
	const storeModel: any = {
		aggregate: jest.fn().mockResolvedValue(found),
		countDocuments: jest.fn().mockResolvedValue(found.length),
		findOne: jest.fn().mockReturnValue({
			lean: jest.fn().mockResolvedValue(found[0] ?? null),
		}),
		find: jest
			.fn()
			.mockReturnValue({ lean: jest.fn().mockResolvedValue(found) }),
	};
	const saleModel: any = { distinct: jest.fn().mockResolvedValue(bought) };

	return {
		storeModel,
		saleModel,
		service: new StoreChatStoresService(storeModel, saleModel),
	};
};

const matchOf = (storeModel: any) => storeModel.countDocuments.mock.calls[0][0];

describe('StoreChatStoresService', () => {
	describe('search', () => {
		it('looks only at active, living, listed stores of other users, even when a hidden one was bought from', async () => {
			const { service, storeModel, saleModel } = build([], [STORE_B]);

			await service.search(BUYER, {});

			const match = matchOf(storeModel);

			expect(match.status).toBe('ACTIVE');
			expect(match.softDelete).toBeNull();
			expect(String(match.userId.$ne)).toBe(BUYER.userId);
			expect(match.isVisibleInSearch).toEqual({ $ne: false });
			expect(match.$or).toBeUndefined();
			expect(match._id).toBeUndefined();

			const saleFilter = saleModel.distinct.mock.calls[0][1];

			expect(saleFilter.$or[0]).toEqual({ 'buyer.userId': BUYER.userId });
			expect(saleFilter.$or[1]['buyer.email'].test('ana@example.COM')).toBe(
				true,
			);
		});

		it('takes regex characters in the search as plain text', async () => {
			const { service, storeModel } = build();

			await service.search(BUYER, { search: ' lo(ja*\\ ' });

			const name: RegExp = matchOf(storeModel).name;

			expect(name.flags).toContain('i');
			expect(name.test('minha LO(JA*\\ nova')).toBe(true);
			expect(name.test('loja')).toBe(false);
		});

		it('gives back the public card and nothing else, bought-from stores first', async () => {
			const { service, storeModel } = build([store()], [STORE_A]);

			const result = await service.search(BUYER, {});

			expect(result.total).toBe(1);
			expect(Object.keys(result.data[0]).sort()).toEqual(
				['_id', 'description', 'logo', 'name', 'type'].sort(),
			);

			const pipeline: any[] = storeModel.aggregate.mock.calls[0][0];
			const sort = pipeline.find((stage: any) => stage.$sort).$sort;

			expect(Object.keys(sort)[0]).toBe('boughtFrom');
			expect(sort.boughtFrom).toBe(-1);
		});

		it('never returns more than 20 at a time', async () => {
			const { service, storeModel } = build();

			await service.search(BUYER, { pagination: { pageSize: 500, skip: 40 } });

			const pipeline: any[] = storeModel.aggregate.mock.calls[0][0];

			expect(pipeline.find((stage: any) => stage.$limit).$limit).toBe(20);
			expect(pipeline.find((stage: any) => '$skip' in stage).$skip).toBe(40);
		});
	});

	describe('findUsable', () => {
		it('refuses an id that is not an id without asking the database', async () => {
			const { service, storeModel } = build([store()]);

			await expect(service.findUsable('not-an-id')).rejects.toBeInstanceOf(
				NotFoundException,
			);
			expect(storeModel.findOne).not.toHaveBeenCalled();
		});

		it('refuses a store that is unknown, inactive or deleted', async () => {
			const { service, storeModel } = build([]);

			await expect(service.findUsable(STORE_A)).rejects.toBeInstanceOf(
				NotFoundException,
			);
			expect(storeModel.findOne.mock.calls[0][0]).toMatchObject({
				status: 'ACTIVE',
				softDelete: null,
			});
		});

		it('gives the store when it can be talked to', async () => {
			const { service } = build([store()]);

			await expect(service.findUsable(STORE_A)).resolves.toMatchObject({
				name: 'Loja Central',
			});
		});
	});
});
