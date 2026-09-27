import {
	BadRequestException,
	ForbiddenException,
	NotFoundException,
} from '@nestjs/common';

import EmployeesEnum from '../employees/interfaces/employees.enum';
import TransactionsEnum from './interfaces/transactions.enum';
import { TransactionsService } from './transactions.service';

const USER_ID: string = '507f1f77bcf86cd799439011';
const EMPLOYEE_ID: string = '507f1f77bcf86cd799439012';
const TX_ID: string = '507f1f77bcf86cd799439013';

const buildTx = (overrides: any = {}): any => ({
	_id: TX_ID,
	userId: USER_ID,
	name: 'Rent',
	type: TransactionsEnum.Type.EXPENSE,
	value: 100,
	status: TransactionsEnum.Status.PENDING,
	createdDate: new Date('2026-09-01T00:00:00.000Z'),
	createdAt: new Date('2026-09-10T12:00:00.000Z'),
	...overrides,
});

const validDto: any = {
	name: '  Rent  ',
	type: TransactionsEnum.Type.EXPENSE,
	value: 100.456,
	status: TransactionsEnum.Status.PENDING,
};

const buildService = (employeeLevel?: EmployeesEnum.Level) => {
	const model: any = {
		create: jest
			.fn()
			.mockImplementation(async (doc: any) => ({ _id: TX_ID, ...doc })),
		findOne: jest.fn().mockResolvedValue(buildTx()),
		findOneAndUpdate: jest.fn().mockResolvedValue(buildTx()),
		deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
		countDocuments: jest.fn().mockResolvedValue(0),
		find: jest.fn().mockResolvedValue([]),
		aggregate: jest.fn().mockResolvedValue([]),
	};

	const employeesService: any = {
		findByIdOrFail: jest
			.fn()
			.mockResolvedValue({ _id: EMPLOYEE_ID, level: employeeLevel }),
	};

	return {
		service: new TransactionsService(model, employeesService),
		model,
		employeesService,
	};
};

const owner = { _id: USER_ID };

describe('TransactionsService', () => {
	describe('access', () => {
		it('lets the owner through without loading an employee', async () => {
			const { service, employeesService } = buildService();

			await service.findByUserTableState(owner, {});

			expect(employeesService.findByIdOrFail).not.toHaveBeenCalled();
		});

		it.each([EmployeesEnum.Level.ADMIN, EmployeesEnum.Level.MASTER])(
			'lets an employee of level %s through',
			async (level) => {
				const { service } = buildService(level);

				await expect(
					service.findByUserTableState(
						{ _id: USER_ID, employeeId: EMPLOYEE_ID },
						{},
					),
				).resolves.toBeDefined();
			},
		);

		it('refuses an employee of level EMPLOYEE on every operation', async () => {
			const { service, model } = buildService(EmployeesEnum.Level.EMPLOYEE);
			const actor = { _id: USER_ID, employeeId: EMPLOYEE_ID };

			await expect(service.create(actor, validDto)).rejects.toBeInstanceOf(
				ForbiddenException,
			);
			await expect(
				service.update(actor, TX_ID, validDto),
			).rejects.toBeInstanceOf(ForbiddenException);
			await expect(service.remove(actor, TX_ID)).rejects.toBeInstanceOf(
				ForbiddenException,
			);
			await expect(
				service.findByUserTableState(actor, {}),
			).rejects.toBeInstanceOf(ForbiddenException);
			await expect(service.summary(actor, {})).rejects.toBeInstanceOf(
				ForbiddenException,
			);

			expect(model.create).not.toHaveBeenCalled();
			expect(model.deleteOne).not.toHaveBeenCalled();
		});
	});

	describe('create', () => {
		it('stores the creator ids, trims the name and rounds the value', async () => {
			const { service, model } = buildService(EmployeesEnum.Level.ADMIN);

			await service.create({ _id: USER_ID, employeeId: EMPLOYEE_ID }, validDto);

			expect(model.create).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: USER_ID,
					createdByUserId: USER_ID,
					createdByEmployeeId: EMPLOYEE_ID,
					name: 'Rent',
					value: 100.46,
					note: null,
					tagsIds: [],
					categoriesIds: [],
					storeIds: [],
				}),
			);
		});

		it('leaves createdByEmployeeId null when the owner creates it', async () => {
			const { service, model } = buildService();

			await service.create(owner, validDto);

			expect(model.create.mock.calls[0][0].createdByEmployeeId).toBeNull();
		});

		it('uses createdAt as createdDate when none is given', async () => {
			const { service, model } = buildService();

			await service.create(owner, validDto);

			const doc: any = model.create.mock.calls[0][0];

			expect(doc.createdDate).toEqual(doc.createdAt);
		});

		it('keeps the manual createdDate when given', async () => {
			const { service, model } = buildService();

			await service.create(owner, {
				...validDto,
				createdDate: '2026-08-15T00:00:00.000Z',
			});

			expect(model.create.mock.calls[0][0].createdDate).toEqual(
				new Date('2026-08-15T00:00:00.000Z'),
			);
		});

		it('ignores a userId sent in the body', async () => {
			const { service, model } = buildService();

			await service.create(owner, {
				...validDto,
				userId: 'someone-else',
			} as any);

			expect(model.create.mock.calls[0][0].userId).toBe(USER_ID);
			expect(model.create.mock.calls[0][0].createdByUserId).toBe(USER_ID);
		});

		it('rejects a name that is only spaces', async () => {
			const { service, model } = buildService();

			await expect(
				service.create(owner, { ...validDto, name: '   ' }),
			).rejects.toBeInstanceOf(BadRequestException);
			expect(model.create).not.toHaveBeenCalled();
		});
	});

	describe('update', () => {
		it('looks the record up by id AND owner', async () => {
			const { service, model } = buildService();

			await service.update(owner, TX_ID, validDto);

			expect(model.findOne).toHaveBeenCalledWith({
				_id: TX_ID,
				userId: USER_ID,
			});
			expect(model.findOneAndUpdate.mock.calls[0][0]).toEqual({
				_id: TX_ID,
				userId: USER_ID,
			});
		});

		it('404s for a record of another user', async () => {
			const { service, model } = buildService();
			model.findOne.mockResolvedValue(null);

			await expect(
				service.update(owner, TX_ID, validDto),
			).rejects.toBeInstanceOf(NotFoundException);
			expect(model.findOneAndUpdate).not.toHaveBeenCalled();
		});

		it('404s on a malformed id without querying', async () => {
			const { service, model } = buildService();

			await expect(
				service.update(owner, 'nope', validDto),
			).rejects.toBeInstanceOf(NotFoundException);
			expect(model.findOne).not.toHaveBeenCalled();
		});

		it('resets createdDate to the record createdAt when it is cleared', async () => {
			const { service, model } = buildService();

			await service.update(owner, TX_ID, { ...validDto, createdDate: null });

			expect(model.findOneAndUpdate.mock.calls[0][1].$set.createdDate).toEqual(
				new Date('2026-09-10T12:00:00.000Z'),
			);
		});

		it('never changes the owner or the creator', async () => {
			const { service, model } = buildService();

			await service.update(owner, TX_ID, { ...validDto, userId: 'x' } as any);

			const set: any = model.findOneAndUpdate.mock.calls[0][1].$set;

			expect(set).not.toHaveProperty('userId');
			expect(set).not.toHaveProperty('createdByUserId');
			expect(set).not.toHaveProperty('createdByEmployeeId');
		});
	});

	describe('remove', () => {
		it('hard deletes by id AND owner', async () => {
			const { service, model } = buildService();

			await service.remove(owner, TX_ID);

			expect(model.deleteOne).toHaveBeenCalledWith({
				_id: TX_ID,
				userId: USER_ID,
			});
		});

		it('404s when nothing was deleted (another user, or already gone)', async () => {
			const { service, model } = buildService();
			model.deleteOne.mockResolvedValue({ deletedCount: 0 });

			await expect(service.remove(owner, TX_ID)).rejects.toBeInstanceOf(
				NotFoundException,
			);
		});

		it('404s on a malformed id without querying', async () => {
			const { service, model } = buildService();

			await expect(service.remove(owner, 'nope')).rejects.toBeInstanceOf(
				NotFoundException,
			);
			expect(model.deleteOne).not.toHaveBeenCalled();
		});
	});

	describe('findByUserTableState', () => {
		it('scopes by the user, sorts by createdDate desc by default and returns total + rows', async () => {
			const { service, model } = buildService();
			model.countDocuments.mockResolvedValue(3);
			model.find.mockResolvedValue([buildTx()]);

			const result = await service.findByUserTableState(owner, {
				pagination: { current: 1, pageSize: 10 },
			});

			expect(
				(model.countDocuments.mock.calls[0][0] as any).userId.toString(),
			).toBe(USER_ID);
			expect(model.find.mock.calls[0][2].sort).toEqual({ createdDate: -1 });
			expect(result).toEqual({ total: 3, data: [buildTx()] });
		});
	});

	describe('summary', () => {
		it('runs three aggregations over the same filter, skipping CANCELED by default', async () => {
			const { service, model } = buildService();

			await service.summary(owner, {});

			expect(model.aggregate).toHaveBeenCalledTimes(3);

			const totalsPipeline: any[] = model.aggregate.mock.calls[0][0];

			expect(totalsPipeline[0].$match.status).toEqual({ $ne: 'CANCELED' });
			expect(totalsPipeline[0].$match.userId.toString()).toBe(USER_ID);
		});

		it('honors an explicit status filter', async () => {
			const { service, model } = buildService();

			await service.summary(owner, {
				filters: { status: [TransactionsEnum.Status.CANCELED] },
			});

			expect(model.aggregate.mock.calls[0][0][0].$match.status).toEqual({
				$in: ['CANCELED'],
			});
		});

		it('builds the category pipeline over EXPENSE only, splitting the value by category count', async () => {
			const { service, model } = buildService();

			await service.summary(owner, {
				filters: { type: [TransactionsEnum.Type.INCOME] },
			});

			const pipeline: any[] = model.aggregate.mock.calls[1][0];

			// the type filter (INCOME) AND the fixed EXPENSE match: nothing can match
			expect(pipeline[0].$match.$and[1]).toEqual({ type: 'EXPENSE' });
			expect(JSON.stringify(pipeline[1])).toContain('$divide');
			expect(pipeline[2].$unwind.preserveNullAndEmptyArrays).toBe(true);
		});

		it('groups the period by day or month, in the given time zone', async () => {
			const { service, model } = buildService();

			await service.summary(owner, {
				granularity: 'day',
				timezone: 'America/Sao_Paulo',
			});

			const group: any = model.aggregate.mock.calls[2][0][1].$group;

			expect(group._id.period.$dateToString).toEqual({
				format: '%Y-%m-%d',
				date: '$createdDate',
				timezone: 'America/Sao_Paulo',
			});

			await service.summary(owner, { timezone: 'Not/AZone' });

			expect(
				model.aggregate.mock.calls[5][0][1].$group._id.period.$dateToString,
			).toEqual({ format: '%Y-%m', date: '$createdDate', timezone: 'UTC' });
		});

		it('shapes the aggregation rows into the summary', async () => {
			const { service, model } = buildService();
			model.aggregate
				.mockResolvedValueOnce([
					{ _id: 'INCOME', total: 200 },
					{ _id: 'EXPENSE', total: 130 },
				])
				.mockResolvedValueOnce([
					{ _id: null, total: 30 },
					{ _id: 'c1', total: 50 },
				])
				.mockResolvedValueOnce([
					{ _id: { period: '2026-09', type: 'INCOME' }, total: 200 },
				]);

			const summary = await service.summary(owner, {});

			expect(summary.totals).toEqual({
				income: 200,
				expense: 130,
				balance: 70,
			});
			expect(summary.expensesByCategory[0]).toEqual({
				categoryId: 'c1',
				total: 50,
			});
			expect(summary.byPeriod).toEqual([
				{ period: '2026-09', income: 200, expense: 0 },
			]);
		});
	});
});
