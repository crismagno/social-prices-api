import { UnauthorizedException } from '@nestjs/common';

import {
	ALLOWS_UNVALIDATED_SIGN_IN_KEY,
	IS_MANAGER_ROUTE_KEY,
	IS_PUBLIC_KEY,
} from '../../../shared/decorators/custom.decorator';
import AuthEnum from '../interfaces/auth.enum';
import { AuthGuard } from './auth.guard';

const buildGuard = (
	metadata: Record<string, boolean>,
	payload: any,
): { guard: AuthGuard; request: any } => {
	const request: any = { headers: { authorization: 'Bearer any-token' } };

	const authorizationTokenMock: any = {
		getToken: jest.fn().mockResolvedValue(payload),
	};

	const reflectorMock: any = {
		getAllAndOverride: jest.fn((key: string) => metadata[key]),
	};

	return {
		guard: new AuthGuard(authorizationTokenMock, reflectorMock),
		request,
	};
};

const buildContext = (request: any): any => ({
	getHandler: () => 'handler',
	getClass: () => 'class',
	switchToHttp: () => ({ getRequest: () => request }),
});

const USER_PAYLOAD: any = {
	_id: 'user-id',
	uid: 'uid',
	email: 'user@test.com',
	type: AuthEnum.PayloadType.USER,
};

const LEGACY_USER_PAYLOAD: any = {
	_id: 'user-id',
	uid: 'uid',
	email: 'user@test.com',
};

const MANAGER_PAYLOAD: any = {
	_id: 'manager-id',
	email: 'manager@test.com',
	level: 'ADMIN',
	isMain: true,
	type: AuthEnum.PayloadType.MANAGER,
	isSignInValidated: true,
};

const UNVALIDATED_MANAGER_PAYLOAD: any = {
	...MANAGER_PAYLOAD,
	isSignInValidated: false,
};

describe('AuthGuard', () => {
	it('lets a public route through without a token', async () => {
		const { guard } = buildGuard({ [IS_PUBLIC_KEY]: true }, null);

		const request: any = { headers: {} };

		await expect(guard.canActivate(buildContext(request))).resolves.toBe(true);
	});

	it('rejects a request with no token', async () => {
		const { guard } = buildGuard({}, USER_PAYLOAD);

		const request: any = { headers: {} };

		await expect(
			guard.canActivate(buildContext(request)),
		).rejects.toBeInstanceOf(UnauthorizedException);
	});

	it('accepts a user token on a user route', async () => {
		const { guard, request } = buildGuard({}, USER_PAYLOAD);

		await expect(guard.canActivate(buildContext(request))).resolves.toBe(true);
	});

	it('accepts a legacy token with no type as a user token', async () => {
		const { guard, request } = buildGuard({}, LEGACY_USER_PAYLOAD);

		await expect(guard.canActivate(buildContext(request))).resolves.toBe(true);
	});

	it('rejects a manager token on a user route', async () => {
		const { guard, request } = buildGuard({}, MANAGER_PAYLOAD);

		await expect(
			guard.canActivate(buildContext(request)),
		).rejects.toBeInstanceOf(UnauthorizedException);
	});

	it('rejects a user token on a manager route', async () => {
		const { guard, request } = buildGuard(
			{ [IS_MANAGER_ROUTE_KEY]: true },
			USER_PAYLOAD,
		);

		await expect(
			guard.canActivate(buildContext(request)),
		).rejects.toBeInstanceOf(UnauthorizedException);
	});

	it('accepts a validated manager token on a manager route', async () => {
		const { guard, request } = buildGuard(
			{ [IS_MANAGER_ROUTE_KEY]: true },
			MANAGER_PAYLOAD,
		);

		await expect(guard.canActivate(buildContext(request))).resolves.toBe(true);
	});

	it('rejects a manager token whose sign in code was not validated yet', async () => {
		const { guard, request } = buildGuard(
			{ [IS_MANAGER_ROUTE_KEY]: true },
			UNVALIDATED_MANAGER_PAYLOAD,
		);

		await expect(
			guard.canActivate(buildContext(request)),
		).rejects.toBeInstanceOf(UnauthorizedException);
	});

	it('accepts an unvalidated manager token only on the route that validates it', async () => {
		const { guard, request } = buildGuard(
			{
				[IS_MANAGER_ROUTE_KEY]: true,
				[ALLOWS_UNVALIDATED_SIGN_IN_KEY]: true,
			},
			UNVALIDATED_MANAGER_PAYLOAD,
		);

		await expect(guard.canActivate(buildContext(request))).resolves.toBe(true);
	});

	it('puts the decoded payload on the request', async () => {
		const { guard, request } = buildGuard({}, USER_PAYLOAD);

		await guard.canActivate(buildContext(request));

		expect(request[AuthEnum.RequestProps.AUTH_PAYLOAD]).toBe(USER_PAYLOAD);
	});
});
