import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

import SalesEnum from '../sales/interfaces/sales.enum';
import { CustomerPortalService } from './customer-portal.service';

const BUYER = { userId: 'u1', email: 'ana@x.com' };
const STORE = new Types.ObjectId().toString();
const PRODUCT = new Types.ObjectId().toString();

const build = (sales: any[] = []) => {
	const saleModel: any = {
		countDocuments: jest.fn().mockResolvedValue(sales.length),
		find: jest.fn().mockResolvedValue(sales),
		findOne: jest.fn().mockResolvedValue(null),
		distinct: jest.fn().mockResolvedValue([STORE]),
	};
	const storeModel: any = {
		find: jest.fn().mockResolvedValue([{ _id: STORE, name: 'Loja Centro' }]),
	};
	const productModel: any = {
		find: jest
			.fn()
			.mockResolvedValue([
				{ _id: PRODUCT, name: 'Café', filesUrl: ['cafe.png', 'cafe-2.png'] },
			]),
	};

	return {
		saleModel,
		storeModel,
		service: new CustomerPortalService(saleModel, storeModel, productModel),
	};
};

const emailBranch = (filter: any): RegExp =>
	filter.$or.find((branch: any) => branch['buyer.email'])['buyer.email'];

describe('CustomerPortalService', () => {
	it('matches the buyer by user id or email, never deleted sales', async () => {
		const { service, saleModel } = build();

		await service.findSales(BUYER, {} as any);

		const filter = saleModel.countDocuments.mock.calls[0][0];
		expect(filter.softDelete).toBeNull();
		expect(filter.$or).toEqual(
			expect.arrayContaining([{ 'buyer.userId': 'u1' }]),
		);
	});

	it('matches the buyer email case-insensitively, and only that email', async () => {
		const { service, saleModel } = build();

		await service.findSales(BUYER, {} as any);

		const regex: RegExp = emailBranch(
			saleModel.countDocuments.mock.calls[0][0],
		);
		expect(regex.test('ANA@X.COM')).toBe(true);
		expect(regex.test('xana@x.com')).toBe(false);
		expect(regex.test('ana@x.com.br')).toBe(false);
	});

	it('names the stores and products of each sale', async () => {
		const { service } = build([
			{
				_id: 's1',
				stores: [{ storeId: STORE, products: [{ productId: PRODUCT }] }],
				toObject() {
					return this;
				},
			},
		]);

		const response = await service.findSales(BUYER, {} as any);

		expect(response.data[0].storesNames).toEqual({ [STORE]: 'Loja Centro' });
		expect(response.data[0].productsNames).toEqual({ [PRODUCT]: 'Café' });
		expect(response.data[0].productsImages).toEqual({ [PRODUCT]: 'cafe.png' });
	});

	it("hides a sale that is not the customer's", async () => {
		const { service } = build();

		await expect(
			service.findSale(BUYER, new Types.ObjectId().toString()),
		).rejects.toBeInstanceOf(NotFoundException);
	});

	it('answers 404 for an id that is not an id', async () => {
		const { service, saleModel } = build();

		await expect(service.findSale(BUYER, 'nope')).rejects.toBeInstanceOf(
			NotFoundException,
		);
		expect(saleModel.findOne).not.toHaveBeenCalled();
	});

	it('dashboard sums completed sales and what is still unpaid', async () => {
		const sale = (over: any) => ({
			stores: [],
			createdAt: new Date(),
			toObject() {
				return this;
			},
			...over,
		});
		const { service } = build([
			sale({
				status: SalesEnum.Status.COMPLETED,
				paymentStatus: SalesEnum.PaymentStatus.COMPLETED,
				totals: { totalFinalAmount: 100 },
				payments: [{ status: SalesEnum.PaymentStatus.COMPLETED, amount: 100 }],
			}),
			sale({
				status: SalesEnum.Status.PENDING,
				paymentStatus: SalesEnum.PaymentStatus.PARTIALLY,
				totals: { totalFinalAmount: 50 },
				payments: [{ status: SalesEnum.PaymentStatus.COMPLETED, amount: 20 }],
			}),
			sale({
				status: SalesEnum.Status.CANCELLED,
				paymentStatus: SalesEnum.PaymentStatus.PENDING,
				totals: { totalFinalAmount: 70 },
				payments: [],
			}),
		]);

		const dashboard = await service.getDashboard(BUYER);

		expect(dashboard.totalPurchases).toBe(3);
		expect(dashboard.totalSpent).toBe(100);
		expect(dashboard.openAmount).toBe(30);
		expect(dashboard.lastPurchases).toHaveLength(3);
	});

	it('filters by the stores picked', async () => {
		const { service, saleModel } = build();

		await service.findSales(BUYER, { filters: { stores: [STORE] } } as any);

		const filter = saleModel.countDocuments.mock.calls[0][0];
		expect(filter['stores.storeId']).toEqual({ $in: [STORE] });
	});

	it('filters by the date of the purchase', async () => {
		const { service, saleModel } = build();

		await service.findSales(BUYER, {
			filters: {
				rangeDate: {
					startDate: '2026-01-01T00:00:00.000Z',
					endDate: '2026-01-31T23:59:59.000Z',
				},
			},
		} as any);

		const filter = saleModel.countDocuments.mock.calls[0][0];
		expect(filter.createdAt).toEqual({
			$gte: new Date('2026-01-01T00:00:00.000Z'),
			$lte: new Date('2026-01-31T23:59:59.000Z'),
		});
	});

	it('keeps the buyer filter whatever other filters come', async () => {
		const { service, saleModel } = build();

		await service.findSales(BUYER, {
			filters: { stores: [STORE], softDelete: 'x', $or: [] },
		} as any);

		const filter = saleModel.countDocuments.mock.calls[0][0];
		expect(filter.softDelete).toBeNull();
		expect(filter.$or).toHaveLength(2);
	});

	it('lists only the stores the customer bought in, by name', async () => {
		const { service, saleModel } = build();

		const stores = await service.findStores(BUYER);

		expect(saleModel.distinct.mock.calls[0][0]).toBe('stores.storeId');
		expect(saleModel.distinct.mock.calls[0][1].softDelete).toBeNull();
		expect(stores).toEqual([{ _id: STORE, name: 'Loja Centro' }]);
	});
});
