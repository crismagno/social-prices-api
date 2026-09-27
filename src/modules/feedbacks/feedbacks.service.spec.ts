import { BadRequestException, NotFoundException } from '@nestjs/common';

import FeedbacksEnum from './interfaces/feedbacks.enum';
import { FeedbacksService } from './feedbacks.service';

const USER_ID: string = '507f1f77bcf86cd799439011';
const EMPLOYEE_ID: string = '507f1f77bcf86cd799439012';
const MANAGER_ID: string = '507f1f77bcf86cd799439013';
const FEEDBACK_ID: string = '507f1f77bcf86cd799439014';

const buildFeedback = (overrides: any = {}): any => ({
	_id: FEEDBACK_ID,
	userId: USER_ID,
	employeeId: null,
	email: 'user@test.com',
	name: 'User',
	message: 'hello',
	status: FeedbacksEnum.Status.NEW,
	statusUpdatedAt: null,
	statusUpdatedByManagerId: null,
	createdAt: new Date(),
	updatedAt: new Date(),
	...overrides,
});

const buildService = () => {
	const model: any = {
		create: jest.fn().mockResolvedValue(buildFeedback()),
		countDocuments: jest.fn().mockResolvedValue(0),
		find: jest.fn().mockResolvedValue([]),
		findById: jest.fn(),
		findByIdAndUpdate: jest.fn(),
	};

	const usersService: any = {
		findOneByIdOrFail: jest
			.fn()
			.mockResolvedValue({ _id: USER_ID, name: 'User' }),
	};

	return {
		service: new FeedbacksService(model, usersService),
		model,
		usersService,
	};
};

describe('FeedbacksService', () => {
	describe('create', () => {
		it('trims the message and stores the sender snapshot with status NEW', async () => {
			const { service, model } = buildService();

			await service.create(
				{ _id: USER_ID, email: 'user@test.com' },
				{ message: '  great app  ' },
			);

			expect(model.create).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: USER_ID,
					employeeId: null,
					email: 'user@test.com',
					name: 'User',
					message: 'great app',
					status: FeedbacksEnum.Status.NEW,
				}),
			);
		});

		it('stores the employee id when an employee is the sender', async () => {
			const { service, model } = buildService();

			await service.create(
				{ _id: USER_ID, email: 'emp@test.com', employeeId: EMPLOYEE_ID },
				{ message: 'hi' },
			);

			expect(model.create).toHaveBeenCalledWith(
				expect.objectContaining({ employeeId: EMPLOYEE_ID }),
			);
		});

		it('rejects a message that is only spaces and newlines', async () => {
			const { service, model } = buildService();

			await expect(
				service.create({ _id: USER_ID, email: 'a@b.c' }, { message: ' \n\t ' }),
			).rejects.toBeInstanceOf(BadRequestException);

			expect(model.create).not.toHaveBeenCalled();
		});
	});

	describe('findByTableState', () => {
		it('searches message, email and name with the text escaped', async () => {
			const { service, model } = buildService();

			await service.findByTableState({ search: 'a.b (x)' });

			const filter: any = model.countDocuments.mock.calls[0][0];
			const regex: RegExp = filter.$or[0].message;

			expect(filter.$or.map((c: any) => Object.keys(c)[0])).toEqual([
				'message',
				'email',
				'name',
			]);
			expect(regex.test('see a.b (x) here')).toBe(true);
			expect(regex.test('see axb x here')).toBe(false);
		});

		it('filters by status with $in', async () => {
			const { service, model } = buildService();

			await service.findByTableState({
				filters: {
					status: [FeedbacksEnum.Status.NEW, FeedbacksEnum.Status.SEEN],
				},
			});

			expect(model.countDocuments.mock.calls[0][0].status).toEqual({
				$in: ['NEW', 'SEEN'],
			});
		});

		it('sorts newest first when the request has no sort', async () => {
			const { service, model } = buildService();

			await service.findByTableState({
				pagination: { current: 1, pageSize: 10 },
			});

			expect(model.find.mock.calls[0][2].sort).toEqual({ createdAt: -1 });
		});

		it('returns the total and the rows', async () => {
			const { service, model } = buildService();
			model.countDocuments.mockResolvedValue(2);
			model.find.mockResolvedValue([
				buildFeedback(),
				buildFeedback({ _id: 'x' }),
			]);

			const result = await service.findByTableState({});

			expect(result.total).toBe(2);
			expect(result.data).toHaveLength(2);
		});
	});

	describe('findById', () => {
		it('returns the feedback', async () => {
			const { service, model } = buildService();
			model.findById.mockResolvedValue(buildFeedback());

			await expect(service.findById(FEEDBACK_ID)).resolves.toMatchObject({
				_id: FEEDBACK_ID,
			});
		});

		it('404s when it does not exist', async () => {
			const { service, model } = buildService();
			model.findById.mockResolvedValue(null);

			await expect(service.findById(FEEDBACK_ID)).rejects.toBeInstanceOf(
				NotFoundException,
			);
		});

		it('404s on a malformed id without querying', async () => {
			const { service, model } = buildService();

			await expect(service.findById('not-an-id')).rejects.toBeInstanceOf(
				NotFoundException,
			);
			expect(model.findById).not.toHaveBeenCalled();
		});
	});

	describe('updateStatus', () => {
		it('sets the status and the audit fields', async () => {
			const { service, model } = buildService();
			model.findByIdAndUpdate.mockResolvedValue(
				buildFeedback({ status: FeedbacksEnum.Status.COMPLETED }),
			);

			const result = await service.updateStatus(
				FEEDBACK_ID,
				{ status: FeedbacksEnum.Status.COMPLETED },
				MANAGER_ID,
			);

			const update: any = model.findByIdAndUpdate.mock.calls[0][1];

			expect(update.$set.status).toBe('COMPLETED');
			expect(update.$set.statusUpdatedAt).toBeInstanceOf(Date);
			expect(String(update.$set.statusUpdatedByManagerId)).toBe(MANAGER_ID);
			expect(model.findByIdAndUpdate.mock.calls[0][2]).toEqual({ new: true });
			expect(result.status).toBe('COMPLETED');
		});

		it('allows reopening a finished feedback back to SEEN', async () => {
			const { service, model } = buildService();
			model.findByIdAndUpdate.mockResolvedValue(
				buildFeedback({ status: FeedbacksEnum.Status.SEEN }),
			);

			await expect(
				service.updateStatus(
					FEEDBACK_ID,
					{ status: FeedbacksEnum.Status.SEEN },
					MANAGER_ID,
				),
			).resolves.toMatchObject({ status: 'SEEN' });
		});

		it('404s when the feedback does not exist', async () => {
			const { service, model } = buildService();
			model.findByIdAndUpdate.mockResolvedValue(null);

			await expect(
				service.updateStatus(
					FEEDBACK_ID,
					{ status: FeedbacksEnum.Status.SEEN },
					MANAGER_ID,
				),
			).rejects.toBeInstanceOf(NotFoundException);
		});
	});
});
