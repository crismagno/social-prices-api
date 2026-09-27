import { BadRequestException, NotFoundException } from '@nestjs/common';

import NotesEnum from './interfaces/notes.enum';
import { NotesService } from './notes.service';

const USER_ID: string = '507f1f77bcf86cd799439011';
const EMPLOYEE_ID: string = '507f1f77bcf86cd799439012';
const NOTE_ID: string = '507f1f77bcf86cd799439013';

const buildNote = (overrides: any = {}): any => ({
	_id: NOTE_ID,
	userId: USER_ID,
	title: 'Call supplier',
	text: 'Ask about the delayed shipment',
	date: new Date('2026-10-01T14:30:00.000Z'),
	status: NotesEnum.Status.PENDING,
	tagsIds: [],
	categoriesIds: [],
	customerIds: [],
	saleIds: [],
	storeIds: [],
	...overrides,
});

const validDto: any = {
	title: '  Call supplier  ',
	text: '  Ask about the delayed shipment  ',
	date: '2026-10-01T14:30:00.000Z',
	status: NotesEnum.Status.PENDING,
};

const buildService = () => {
	const model: any = {
		create: jest
			.fn()
			.mockImplementation(async (doc: any) => ({ _id: NOTE_ID, ...doc })),
		findOneAndUpdate: jest.fn().mockResolvedValue(buildNote()),
		deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
		countDocuments: jest.fn().mockResolvedValue(0),
		find: jest.fn().mockResolvedValue([]),
		aggregate: jest.fn().mockResolvedValue([]),
	};

	return { service: new NotesService(model), model };
};

const owner = { _id: USER_ID };

describe('NotesService', () => {
	describe('create', () => {
		it('stores the creator ids and trims title/text', async () => {
			const { service, model } = buildService();

			await service.create({ _id: USER_ID, employeeId: EMPLOYEE_ID }, validDto);

			expect(model.create).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: USER_ID,
					createdByUserId: USER_ID,
					createdByEmployeeId: EMPLOYEE_ID,
					title: 'Call supplier',
					text: 'Ask about the delayed shipment',
					tagsIds: [],
					categoriesIds: [],
					customerIds: [],
					saleIds: [],
					storeIds: [],
				}),
			);
		});

		it('leaves createdByEmployeeId null when the owner creates it', async () => {
			const { service, model } = buildService();

			await service.create(owner, validDto);

			expect(model.create.mock.calls[0][0].createdByEmployeeId).toBeNull();
		});

		it('ignores a userId sent in the body', async () => {
			const { service, model } = buildService();

			await service.create(owner, { ...validDto, userId: 'someone-else' });

			expect(model.create.mock.calls[0][0].userId).toBe(USER_ID);
		});

		it('rejects a title or text that is only spaces', async () => {
			const { service, model } = buildService();

			await expect(
				service.create(owner, { ...validDto, title: '   ' }),
			).rejects.toBeInstanceOf(BadRequestException);
			await expect(
				service.create(owner, { ...validDto, text: '   ' }),
			).rejects.toBeInstanceOf(BadRequestException);
			expect(model.create).not.toHaveBeenCalled();
		});
	});

	describe('update', () => {
		it('scopes the update by id AND owner, and never changes the owner/creator', async () => {
			const { service, model } = buildService();

			await service.update(owner, NOTE_ID, validDto);

			expect(model.findOneAndUpdate.mock.calls[0][0]).toEqual({
				_id: NOTE_ID,
				userId: USER_ID,
			});

			const set: any = model.findOneAndUpdate.mock.calls[0][1].$set;

			expect(set).not.toHaveProperty('userId');
			expect(set).not.toHaveProperty('createdByUserId');
			expect(set).not.toHaveProperty('createdByEmployeeId');
		});

		it('404s for a note of another user', async () => {
			const { service, model } = buildService();
			model.findOneAndUpdate.mockResolvedValue(null);

			await expect(
				service.update(owner, NOTE_ID, validDto),
			).rejects.toBeInstanceOf(NotFoundException);
		});

		it('404s on a malformed id without querying', async () => {
			const { service, model } = buildService();

			await expect(
				service.update(owner, 'nope', validDto),
			).rejects.toBeInstanceOf(NotFoundException);
			expect(model.findOneAndUpdate).not.toHaveBeenCalled();
		});
	});

	describe('updateStatus', () => {
		it('changes only the status', async () => {
			const { service, model } = buildService();

			await service.updateStatus(owner, NOTE_ID, {
				status: NotesEnum.Status.COMPLETED,
			});

			expect(model.findOneAndUpdate.mock.calls[0][0]).toEqual({
				_id: NOTE_ID,
				userId: USER_ID,
			});
			expect(model.findOneAndUpdate.mock.calls[0][1].$set).toEqual({
				status: 'COMPLETED',
				updatedAt: expect.any(Date),
			});
		});

		it('404s for a note of another user', async () => {
			const { service, model } = buildService();
			model.findOneAndUpdate.mockResolvedValue(null);

			await expect(
				service.updateStatus(owner, NOTE_ID, {
					status: NotesEnum.Status.COMPLETED,
				}),
			).rejects.toBeInstanceOf(NotFoundException);
		});
	});

	describe('remove', () => {
		it('hard deletes by id AND owner', async () => {
			const { service, model } = buildService();

			await service.remove(owner, NOTE_ID);

			expect(model.deleteOne).toHaveBeenCalledWith({
				_id: NOTE_ID,
				userId: USER_ID,
			});
		});

		it('404s when nothing was deleted', async () => {
			const { service, model } = buildService();
			model.deleteOne.mockResolvedValue({ deletedCount: 0 });

			await expect(service.remove(owner, NOTE_ID)).rejects.toBeInstanceOf(
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
		it('scopes by the user, sorts by date desc by default', async () => {
			const { service, model } = buildService();
			model.countDocuments.mockResolvedValue(1);
			model.find.mockResolvedValue([buildNote()]);

			const result = await service.findByUserTableState(owner, {
				pagination: { current: 1, pageSize: 10 },
			});

			expect(
				(model.countDocuments.mock.calls[0][0] as any).userId.toString(),
			).toBe(USER_ID);
			expect(model.find.mock.calls[0][2].sort).toEqual({ date: -1 });
			expect(result).toEqual({ total: 1, data: [buildNote()] });
		});
	});

	describe('calendarMarkers', () => {
		it('adds the month range to the filter and shapes the result', async () => {
			const { service, model } = buildService();
			model.aggregate.mockResolvedValue([
				{
					_id: { date: '2026-09-05', status: 'PENDING' },
					count: 2,
					colors: ['#ff0000'],
				},
			]);

			const markers = await service.calendarMarkers(owner, {
				monthStart: '2026-09-01T00:00:00.000Z',
				monthEnd: '2026-09-30T23:59:59.999Z',
			});

			const pipeline: any[] = model.aggregate.mock.calls[0][0];

			expect(pipeline[0].$match.date).toEqual({
				$gte: new Date('2026-09-01T00:00:00.000Z'),
				$lte: new Date('2026-09-30T23:59:59.999Z'),
			});
			expect(pipeline[1].$group.colors).toEqual({ $addToSet: '$color' });
			expect(markers).toEqual([
				{
					date: '2026-09-05',
					pending: 2,
					completed: 0,
					cancelled: 0,
					colors: ['#ff0000'],
				},
			]);
		});
	});
});
