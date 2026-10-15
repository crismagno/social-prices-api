import AuthEnum from '../../auth/interfaces/auth.enum';
import { AppNotEnabledException } from '../apps.exceptions';
import AppsEnum from '../interfaces/apps.enum';
import { AppEnabledGuard } from './app-enabled.guard';

const contextFor = (appId: string, payload: any): any => ({
	switchToHttp: () => ({
		getRequest: () => ({
			params: { appId },
			[AuthEnum.RequestProps.AUTH_PAYLOAD]: payload,
		}),
	}),
});

describe('AppEnabledGuard', () => {
	const buildGuard = (user: any) =>
		new AppEnabledGuard({
			findOneById: jest.fn().mockResolvedValue(user),
		} as any);

	it('lets the request through when the app is enabled', async () => {
		const guard = buildGuard({ enabledApps: [AppsEnum.App.GOOGLE_CONTACTS] });

		await expect(
			guard.canActivate(
				contextFor(AppsEnum.App.GOOGLE_CONTACTS, { _id: 'u1' }),
			),
		).resolves.toBe(true);
	});

	it('refuses with APP_NOT_ENABLED when it is not', async () => {
		const guard = buildGuard({ enabledApps: [AppsEnum.App.TELEGRAM] });

		await expect(
			guard.canActivate(
				contextFor(AppsEnum.App.GOOGLE_CONTACTS, { _id: 'u1' }),
			),
		).rejects.toBeInstanceOf(AppNotEnabledException);
	});

	it('treats a user without the field as having nothing enabled', async () => {
		const guard = buildGuard({});

		await expect(
			guard.canActivate(
				contextFor(AppsEnum.App.GOOGLE_CONTACTS, { _id: 'u1' }),
			),
		).rejects.toBeInstanceOf(AppNotEnabledException);
	});

	it('refuses when the user no longer exists', async () => {
		const guard = buildGuard(undefined);

		await expect(
			guard.canActivate(
				contextFor(AppsEnum.App.GOOGLE_CONTACTS, { _id: 'u1' }),
			),
		).rejects.toBeInstanceOf(AppNotEnabledException);
	});
});
