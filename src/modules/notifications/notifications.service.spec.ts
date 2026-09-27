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
