import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

import { CustomersService } from './customers.service';

const S1 = new Types.ObjectId().toString();
const S2 = new Types.ObjectId().toString();
const S9 = new Types.ObjectId().toString();
const C1 = new Types.ObjectId().toString();
const C2 = new Types.ObjectId().toString();

const build = () => {
	const created: any[] = [];

	// A Mongoose model is both a constructor (create) and a bag of statics.
	const model: any = jest.fn().mockImplementation(function (doc: any) {
		created.push(doc);
		this.save = jest.fn().mockResolvedValue({ _id: 'new', ...doc });
	});
	model.findOne = jest.fn().mockResolvedValue(null);
	model.findById = jest
		.fn()
		.mockResolvedValue({ _id: C1, avatar: null, storesIds: [] });
	model.findByIdAndUpdate = jest.fn().mockResolvedValue({ _id: C1 });
	model.countDocuments = jest.fn().mockResolvedValue(0);
	model.find = jest.fn().mockResolvedValue([]);
	model.bulkWrite = jest.fn().mockResolvedValue({});

	const users: any = {
		findOneByIdOrFail: jest.fn().mockResolvedValue({ _id: 'u1' }),
	};
	const notifications: any = {
		createdCustomer: jest.fn().mockResolvedValue(undefined),
		updatedCustomer: jest.fn().mockResolvedValue(undefined),
	};
	const featureLimits: any = {
		assertCanCreate: jest.fn().mockResolvedValue(undefined),
	};
	const stores: any = {
		findStoreIdsByUserId: jest.fn().mockResolvedValue([S1, S2]),
		findByIdOrFail: jest.fn().mockResolvedValue({ _id: S1, userId: 'u1' }),
	};
	const files: any = { uploadFile: jest.fn() };

	const service = new CustomersService(
		model,
		users,
		files,
		notifications,
		{} as any,
		{} as any,
		{} as any,
		{} as any,
		featureLimits,
		stores,
	);

	return { service, model, stores, files, created };
};

const baseDto = (over: any = {}): any => ({
	name: 'Ana',
	email: 'ana@x.com',
	addresses: [],
	phoneNumbers: [],
	tagsIds: [],
	...over,
});

describe('CustomersService — stores', () => {
	it('saves storesIds on create, deduplicated', async () => {
		const { service, created } = build();

		await service.create(null, baseDto({ storesIds: [S1, S1, S2] }), 'u1');

		expect(created[0].storesIds).toEqual([S1, S2]);
	});

	it('saves an empty list on create when none is sent', async () => {
		const { service, created } = build();

		await service.create(null, baseDto(), 'u1');

		expect(created[0].storesIds).toEqual([]);
	});

	it('parses storesIds sent as a JSON string', async () => {
		const { service, model } = build();

		await service.update(
			null,
			baseDto({ customerId: C1, storesIds: JSON.stringify([S2]) }),
			'u1',
		);

		expect(model.findByIdAndUpdate.mock.calls[0][1].$set.storesIds).toEqual([
			S2,
		]);
	});

	it('keeps storesIds when the update does not send them', async () => {
		const { service, model } = build();

		await service.update(null, baseDto({ customerId: C1 }), 'u1');

		expect(model.findByIdAndUpdate.mock.calls[0][1].$set).not.toHaveProperty(
			'storesIds',
		);
	});

	it("rejects a store that is not the owner's", async () => {
		const { service, model } = build();

		await expect(
			service.update(null, baseDto({ customerId: C1, storesIds: [S9] }), 'u1'),
		).rejects.toBeInstanceOf(BadRequestException);
		expect(model.findByIdAndUpdate).not.toHaveBeenCalled();
	});

	it('addStoresToCustomers groups the links by customer', async () => {
		const { service, model } = build();

		await service.addStoresToCustomers([
			{ customerId: C1, storeId: S1 },
			{ customerId: C1, storeId: S2 },
			{ customerId: C2, storeId: S1 },
		]);

		expect(model.bulkWrite).toHaveBeenCalledTimes(1);
		const ops = model.bulkWrite.mock.calls[0][0];
		expect(ops).toHaveLength(2);
		expect(String(ops[0].updateOne.filter._id)).toBe(C1);
		expect(
			ops[0].updateOne.update.$addToSet.storesIds.$each.map(String),
		).toEqual([S1, S2]);
		expect(ops[0].updateOne.update.$addToSet.storesIds.$each[0]).toBeInstanceOf(
			Types.ObjectId,
		);
	});

	it('addStoresToCustomers does nothing without links', async () => {
		const { service, model } = build();

		await service.addStoresToCustomers([]);

		expect(model.bulkWrite).not.toHaveBeenCalled();
	});

	describe('customers of a store', () => {
		it('filters by store', async () => {
			const { service, model } = build();

			await service.findByStoreTableState('u1', S1, {} as any);

			expect(model.countDocuments).toHaveBeenCalledWith(
				expect.objectContaining({ ownerUserId: 'u1', storesIds: S1 }),
			);
		});

		it('refuses a store of another owner', async () => {
			const { service, model, stores } = build();
			stores.findByIdOrFail.mockResolvedValue({ _id: S1, userId: 'u2' });

			await expect(
				service.findByStoreTableState('u1', S1, {} as any),
			).rejects.toBeInstanceOf(NotFoundException);
			expect(model.countDocuments).not.toHaveBeenCalled();
		});
	});
});
