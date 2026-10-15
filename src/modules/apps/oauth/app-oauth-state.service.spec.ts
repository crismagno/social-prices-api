import { JwtService } from '@nestjs/jwt';

import AppsEnum from '../interfaces/apps.enum';
import { AppOAuthStateService } from './app-oauth-state.service';

const STATE = {
	ownerUserId: 'u1',
	employeeId: 'e1',
	appId: AppsEnum.App.GOOGLE_CONTACTS,
};

describe('AppOAuthStateService', () => {
	const jwt = new JwtService({});
	const service = new AppOAuthStateService(jwt);

	beforeAll(() => {
		process.env.JWT_SECRET_KEY = 'test-login-secret';
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('round-trips the state', async () => {
		const token = await service.sign(STATE);

		await expect(
			service.verify(token, AppsEnum.App.GOOGLE_CONTACTS),
		).resolves.toEqual(STATE);
	});

	it('normalises a missing employee id to null', async () => {
		const token = await service.sign({ ...STATE, employeeId: undefined });

		await expect(
			service.verify(token, AppsEnum.App.GOOGLE_CONTACTS),
		).resolves.toMatchObject({ employeeId: null });
	});

	it('rejects a state minted for another app', async () => {
		const token = await service.sign(STATE);

		await expect(
			service.verify(token, AppsEnum.App.INSTAGRAM),
		).rejects.toThrow();
	});

	it('rejects an expired state (valid for 10 minutes)', async () => {
		const realNow = Date.now();
		const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(realNow);
		const token = await service.sign(STATE);

		nowSpy.mockReturnValue(realNow + 11 * 60 * 1000);

		await expect(
			service.verify(token, AppsEnum.App.GOOGLE_CONTACTS),
		).rejects.toThrow();
	});

	it('rejects a tampered state', async () => {
		const token = await service.sign(STATE);

		await expect(
			service.verify(`${token}x`, AppsEnum.App.GOOGLE_CONTACTS),
		).rejects.toThrow();
	});

	it('rejects a login-style token signed with the plain JWT secret', async () => {
		const loginToken = await jwt.signAsync(
			{ _id: 'u1', ...STATE, purpose: 'APP_OAUTH_STATE' },
			{ secret: 'test-login-secret' },
		);

		await expect(
			service.verify(loginToken, AppsEnum.App.GOOGLE_CONTACTS),
		).rejects.toThrow();
	});
});
