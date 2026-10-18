import { Reflector } from '@nestjs/core';

import AuthEnum from '../../../auth/interfaces/auth.enum';
import { AppNotEnabledException } from '../../apps.exceptions';
import AppsEnum from '../../interfaces/apps.enum';
import { AppEnabledGuard } from './app-enabled.guard';
import { RequiresApp } from './requires-app.decorator';

class GoogleController {
	@RequiresApp(AppsEnum.App.GOOGLE_CONTACTS)
	public guarded(): void {}

	public unmarked(): void {}
}

const contextFor = (handler: () => void, payload: any): any => ({
	getHandler: () => handler,
	getClass: () => GoogleController,
	switchToHttp: () => ({
		getRequest: () => ({
			[AuthEnum.RequestProps.AUTH_PAYLOAD]: payload,
		}),
	}),
});

describe('AppEnabledGuard', () => {
	const buildGuard = (user: any) =>
		new AppEnabledGuard(
			{ findOneById: jest.fn().mockResolvedValue(user) } as any,
			new Reflector(),
		);

	const guarded = GoogleController.prototype.guarded;
	const unmarked = GoogleController.prototype.unmarked;

	it('lets the request through when the app of the route is enabled', async () => {
		const guard = buildGuard({ enabledApps: [AppsEnum.App.GOOGLE_CONTACTS] });

		await expect(
			guard.canActivate(contextFor(guarded, { _id: 'u1' })),
		).resolves.toBe(true);
	});

	it('refuses with APP_NOT_ENABLED when only other apps are enabled', async () => {
		const guard = buildGuard({ enabledApps: [AppsEnum.App.TELEGRAM] });

		await expect(
			guard.canActivate(contextFor(guarded, { _id: 'u1' })),
		).rejects.toBeInstanceOf(AppNotEnabledException);
	});

	it('treats a user without the field as having nothing enabled', async () => {
		await expect(
			buildGuard({}).canActivate(contextFor(guarded, { _id: 'u1' })),
		).rejects.toBeInstanceOf(AppNotEnabledException);
	});

	it('refuses when the user no longer exists', async () => {
		await expect(
			buildGuard(undefined).canActivate(contextFor(guarded, { _id: 'u1' })),
		).rejects.toBeInstanceOf(AppNotEnabledException);
	});

	it('fails closed on a route nobody marked with @RequiresApp', async () => {
		const guard = buildGuard({ enabledApps: Object.values(AppsEnum.App) });

		await expect(
			guard.canActivate(contextFor(unmarked, { _id: 'u1' })),
		).rejects.toBeInstanceOf(AppNotEnabledException);
	});
});
