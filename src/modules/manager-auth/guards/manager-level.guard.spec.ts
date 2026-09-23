import { ForbiddenException, UnauthorizedException } from '@nestjs/common';

import AuthEnum from '../../auth/interfaces/auth.enum';
import ManagersEnum from '../../managers/interfaces/managers.enum';
import { MANAGER_LEVELS_KEY, ManagerLevelGuard } from './manager-level.guard';

const ACTOR_ID: string = '507f1f77bcf86cd799439041';

const buildStoredManager = (overrides: any = {}): any => ({
	_id: ACTOR_ID,
	level: ManagersEnum.Level.ADMIN,
	isActive: true,
	isMain: false,
	softDelete: null,
	...overrides,
});

const buildGuard = (
	levels: ManagersEnum.Level[] | undefined,
	payload: any,
	storedManager: any,
): { guard: ManagerLevelGuard; request: any; managersServiceMock: any } => {
	const request: any = {
		[AuthEnum.RequestProps.AUTH_PAYLOAD]: payload,
	};

	const reflectorMock: any = {
		getAllAndOverride: jest.fn((key: string) =>
			key === MANAGER_LEVELS_KEY ? levels : undefined,
		),
	};

	const managersServiceMock: any = {
		findById: jest.fn().mockResolvedValue(storedManager),
	};

	return {
		guard: new ManagerLevelGuard(reflectorMock, managersServiceMock),
		request,
		managersServiceMock,
	};
};

const buildContext = (request: any): any => ({
	getHandler: () => 'handler',
	getClass: () => 'class',
	switchToHttp: () => ({ getRequest: () => request }),
});

const WRITE_LEVELS: ManagersEnum.Level[] = [
	ManagersEnum.Level.ADMIN,
	ManagersEnum.Level.MANAGER,
];

const payloadWithLevel = (level: ManagersEnum.Level): any => ({
	_id: ACTOR_ID,
	level,
	isMain: false,
});

describe('ManagerLevelGuard', () => {
	describe('coarse level rule', () => {
		it('allows any manager through a route with no @ManagerLevels metadata', async () => {
			const { guard, request } = buildGuard(
				undefined,
				payloadWithLevel(ManagersEnum.Level.SUB_MANAGER),
				buildStoredManager({ level: ManagersEnum.Level.SUB_MANAGER }),
			);

			await expect(guard.canActivate(buildContext(request))).resolves.toBe(
				true,
			);
		});

		it('allows an ADMIN on a route requiring [ADMIN, MANAGER]', async () => {
			const { guard, request } = buildGuard(
				WRITE_LEVELS,
				payloadWithLevel(ManagersEnum.Level.ADMIN),
				buildStoredManager({ level: ManagersEnum.Level.ADMIN }),
			);

			await expect(guard.canActivate(buildContext(request))).resolves.toBe(
				true,
			);
		});

		it('allows a MANAGER on a route requiring [ADMIN, MANAGER]', async () => {
			const { guard, request } = buildGuard(
				WRITE_LEVELS,
				payloadWithLevel(ManagersEnum.Level.MANAGER),
				buildStoredManager({ level: ManagersEnum.Level.MANAGER }),
			);

			await expect(guard.canActivate(buildContext(request))).resolves.toBe(
				true,
			);
		});

		it('refuses a SUB_MANAGER on a route requiring [ADMIN, MANAGER]', async () => {
			const { guard, request } = buildGuard(
				WRITE_LEVELS,
				payloadWithLevel(ManagersEnum.Level.SUB_MANAGER),
				buildStoredManager({ level: ManagersEnum.Level.SUB_MANAGER }),
			);

			await expect(
				guard.canActivate(buildContext(request)),
			).rejects.toBeInstanceOf(ForbiddenException);
		});
	});

	describe('fresh actor from the database', () => {
		it('refuses a payload with no manager id', async () => {
			const { guard, request } = buildGuard(
				WRITE_LEVELS,
				{ level: ManagersEnum.Level.ADMIN },
				buildStoredManager(),
			);

			await expect(
				guard.canActivate(buildContext(request)),
			).rejects.toBeInstanceOf(UnauthorizedException);
		});

		it('refuses a token whose manager no longer exists', async () => {
			const { guard, request } = buildGuard(
				undefined,
				payloadWithLevel(ManagersEnum.Level.ADMIN),
				null,
			);

			await expect(
				guard.canActivate(buildContext(request)),
			).rejects.toBeInstanceOf(UnauthorizedException);
		});

		it('refuses a soft deleted manager whose token is still valid', async () => {
			const { guard, request } = buildGuard(
				undefined,
				payloadWithLevel(ManagersEnum.Level.ADMIN),
				buildStoredManager({ softDelete: { isDeleted: true } }),
			);

			await expect(
				guard.canActivate(buildContext(request)),
			).rejects.toBeInstanceOf(ForbiddenException);
		});

		it('refuses a deactivated manager whose token is still valid', async () => {
			const { guard, request } = buildGuard(
				undefined,
				payloadWithLevel(ManagersEnum.Level.ADMIN),
				buildStoredManager({ isActive: false }),
			);

			await expect(
				guard.canActivate(buildContext(request)),
			).rejects.toBeInstanceOf(ForbiddenException);
		});

		it('uses the stored level, not the token level, for a demoted manager', async () => {
			const payload: any = payloadWithLevel(ManagersEnum.Level.ADMIN);

			const { guard, request } = buildGuard(
				WRITE_LEVELS,
				payload,
				buildStoredManager({ level: ManagersEnum.Level.SUB_MANAGER }),
			);

			await expect(
				guard.canActivate(buildContext(request)),
			).rejects.toBeInstanceOf(ForbiddenException);

			expect(payload.level).toBe(ManagersEnum.Level.SUB_MANAGER);
		});

		it('overwrites level and isMain on the payload the controller will read', async () => {
			const payload: any = payloadWithLevel(ManagersEnum.Level.SUB_MANAGER);

			const { guard, request, managersServiceMock } = buildGuard(
				undefined,
				payload,
				buildStoredManager({
					level: ManagersEnum.Level.MANAGER,
					isMain: true,
				}),
			);

			await guard.canActivate(buildContext(request));

			expect(managersServiceMock.findById).toHaveBeenCalledWith(ACTOR_ID);
			expect(payload.level).toBe(ManagersEnum.Level.MANAGER);
			expect(payload.isMain).toBe(true);
		});
	});
});
