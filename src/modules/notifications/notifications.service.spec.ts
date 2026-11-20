import { NotificationsService } from './notifications.service';

const USER_ID: string = '507f1f77bcf86cd799439011';

describe('NotificationsService.updateAllToSeenByUser', () => {
	const build = () => {
		const service: any = Object.create(NotificationsService.prototype);
		const model: any = { updateMany: jest.fn().mockResolvedValue({}) };

		service._notificationModel = model;

		return { service: service as NotificationsService, model };
	};

	it('marks only the unseen notifications of that user as seen', async () => {
		const { service, model } = build();

		await service.updateAllToSeenByUser(USER_ID);

		expect(model.updateMany).toHaveBeenCalledWith(
			{ userId: USER_ID, isSeen: false },
			{ $set: { isSeen: true } },
		);
	});
});

describe('NotificationsService.findByUserTableState', () => {
	const build = () => {
		const service: any = Object.create(NotificationsService.prototype);
		const model: any = {
			countDocuments: jest.fn().mockResolvedValue(0),
			find: jest.fn().mockResolvedValue([]),
		};

		service._notificationModel = model;

		return { service: service as NotificationsService, model };
	};

	const filterUsed = (model: any) => model.countDocuments.mock.calls[0][0];

	it('does not filter by date when no range is sent', async () => {
		const { service, model } = build();

		await service.findByUserTableState(USER_ID, { filters: {} });

		expect(filterUsed(model)).toEqual({ userId: USER_ID });
	});

	it('filters createdAt between the start and end of the range', async () => {
		const { service, model } = build();
		const startDate: string = '2026-11-01T00:00:00.000Z';
		const endDate: string = '2026-11-19T23:59:59.999Z';

		await service.findByUserTableState(USER_ID, {
			filters: { rangeDate: { startDate, endDate } },
		});

		expect(filterUsed(model).createdAt).toEqual({
			$gte: new Date(startDate),
			$lte: new Date(endDate),
		});
		expect(model.find.mock.calls[0][0]).toEqual(filterUsed(model));
	});

	it('applies only the valid bound of a partial range', async () => {
		const { service, model } = build();
		const startDate: string = '2026-11-01T00:00:00.000Z';

		await service.findByUserTableState(USER_ID, {
			filters: { rangeDate: { startDate, endDate: 'not-a-date' } },
		});

		expect(filterUsed(model).createdAt).toEqual({ $gte: new Date(startDate) });
	});

	it('keeps the type filter together with the date range', async () => {
		const { service, model } = build();
		const startDate: string = '2026-11-01T00:00:00.000Z';
		const endDate: string = '2026-11-19T23:59:59.999Z';

		await service.findByUserTableState(USER_ID, {
			filters: { type: ['INFO'], rangeDate: { startDate, endDate } },
		});

		expect(filterUsed(model)).toEqual({
			userId: USER_ID,
			type: { $in: ['INFO'] },
			createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
		});
	});
});
