import { ConflictException } from '@nestjs/common';

import UsersEnum from './interfaces/users.enum';
import { UsersService } from './users.service';

const TARGET_ID: string = '507f1f77bcf86cd799439031';
const OTHER_ID: string = '507f1f77bcf86cd799439032';

const buildUser = (overrides: any = {}): any => ({
	_id: TARGET_ID,
	email: 'target@test.com',
	username: 'target',
	password: 'hashed',
	authToken: 'token',
	authProvider: UsersEnum.Provider.SOCIAL_PRICES,
	...overrides,
});

const buildService = () => {
	const userModel: any = {
		findOne: jest.fn(),
		findOneAndUpdate: jest.fn(),
	};

	const service = new UsersService(
		userModel,
		{} as any,
		{} as any,
		{} as any,
		{} as any,
	);

	return { service, userModel };
};

const validDto: any = {
	name: 'New Name',
	email: 'new@test.com',
	username: 'newname',
	status: UsersEnum.Status.ACTIVE,
	type: UsersEnum.Type.COMMON,
	// must be ignored:
	password: 'hacked',
	authProvider: 'GOOGLE',
	authToken: 'evil',
};

describe('UsersService manager updates', () => {
	it('never writes password, authToken or authProvider', async () => {
		const { service, userModel } = buildService();
		userModel.findOne.mockResolvedValue(null);
		userModel.findOneAndUpdate.mockResolvedValue(buildUser());

		await service.updateUserByManager(TARGET_ID, validDto);

		const update: any = userModel.findOneAndUpdate.mock.calls[0][1];

		expect(update.$set).not.toHaveProperty('password');
		expect(update.$set).not.toHaveProperty('authToken');
		expect(update.$set).not.toHaveProperty('authProvider');
		expect(update.$set).toMatchObject({
			name: 'New Name',
			email: 'new@test.com',
			username: 'newname',
			status: UsersEnum.Status.ACTIVE,
		});
	});

	it('rejects an email already used by another user', async () => {
		const { service, userModel } = buildService();
		userModel.findOne.mockResolvedValueOnce(buildUser({ _id: OTHER_ID }));

		await expect(
			service.updateUserByManager(TARGET_ID, validDto),
		).rejects.toBeInstanceOf(ConflictException);

		expect(userModel.findOneAndUpdate).not.toHaveBeenCalled();
	});

	it('excludes the target user itself from the duplicate lookup', async () => {
		const { service, userModel } = buildService();
		userModel.findOne.mockResolvedValue(null);
		userModel.findOneAndUpdate.mockResolvedValue(buildUser());

		await service.updateUserByManager(TARGET_ID, validDto);

		const filter: any = userModel.findOne.mock.calls[0][0];

		expect(filter.$or).toEqual([
			{ email: 'new@test.com' },
			{ username: 'newname' },
		]);
		expect(filter._id.$ne.toString()).toBe(TARGET_ID);
	});

	it('replaces limits.features with only the provided numeric entries', async () => {
		const { service, userModel } = buildService();
		userModel.findOneAndUpdate.mockResolvedValue(buildUser());

		await service.updateUserLimits(TARGET_ID, {
			features: { products: 10, 'product-items': 20, tags: null },
		} as any);

		const update: any = userModel.findOneAndUpdate.mock.calls[0][1];

		expect(update.$set['limits.features']).toEqual({
			products: 10,
			'product-items': 20,
		});
	});
});
