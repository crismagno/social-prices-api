import {
	BadRequestException,
	ForbiddenException,
	NotFoundException,
	UnauthorizedException,
} from '@nestjs/common';

import ManagersEnum from '../managers/interfaces/managers.enum';
import { ManagerAuthService } from './manager-auth.service';

const MANAGER_ID: string = '507f1f77bcf86cd799439031';

const buildManager = (overrides: any = {}): any => ({
	_id: MANAGER_ID,
	name: 'Main Manager',
	email: 'main@test.com',
	password: 'hashed',
	birthDate: null,
	level: ManagersEnum.Level.ADMIN,
	isActive: true,
	isMain: true,
	createdByManagerId: null,
	softDelete: null,
	createdAt: new Date(),
	updatedAt: new Date(),
	...overrides,
});

describe('ManagerAuthService', () => {
	let managersServiceMock: any;
	let codesServiceMock: any;
	let notificationsServiceMock: any;
	let hashCryptMock: any;
	let authorizationTokenMock: any;
	let service: ManagerAuthService;

	beforeEach(() => {
		process.env.MANAGER_JWT_EXPIRES_IN = '30d';

		managersServiceMock = {
			findOneByEmail: jest.fn(),
			findByIdOrFail: jest.fn(),
			updatePassword: jest.fn().mockResolvedValue(undefined),
		};

		codesServiceMock = {
			validateManagerSignIn: jest.fn(),
			validateManagerRecoverPassword: jest.fn(),
		};

		notificationsServiceMock = {
			sendManagerSignInCode: jest.fn().mockResolvedValue({ email: 'sent' }),
			sendManagerRecoverPasswordCode: jest
				.fn()
				.mockResolvedValue({ email: 'sent' }),
		};

		hashCryptMock = {
			isMatchCompare: jest.fn().mockResolvedValue(true),
			generateHash: jest.fn().mockResolvedValue('dummy-hash'),
		};

		authorizationTokenMock = {
			generateToken: jest.fn().mockResolvedValue('signed-token'),
		};

		service = new ManagerAuthService(
			managersServiceMock,
			codesServiceMock,
			notificationsServiceMock,
			hashCryptMock,
			authorizationTokenMock,
		);
	});

	describe('signIn', () => {
		it('emails the code and issues a token that is not validated yet', async () => {
			managersServiceMock.findOneByEmail.mockResolvedValue(buildManager());

			const login = await service.signIn('main@test.com', 'secret');

			expect(login.authToken).toBe('signed-token');
			expect(notificationsServiceMock.sendManagerSignInCode).toHaveBeenCalled();

			const [payload, options] =
				authorizationTokenMock.generateToken.mock.calls[0];

			expect(payload.isSignInValidated).toBe(false);
			expect(payload.type).toBe('MANAGER');
			expect(options).toEqual({ expiresIn: '30d' });
		});

		it('never returns the password hash', async () => {
			managersServiceMock.findOneByEmail.mockResolvedValue(buildManager());

			const login: any = await service.signIn('main@test.com', 'secret');

			// Checks what actually goes over the wire, not a single property: the
			// entity once kept the raw document in a parameter property, which left
			// `manager.password` undefined while `manager._manager.password` shipped.
			expect(login.manager.password).toBeUndefined();
			expect(JSON.stringify(login)).not.toContain('hashed');
		});

		it('refuses an unknown email', async () => {
			managersServiceMock.findOneByEmail.mockResolvedValue(undefined);

			await expect(
				service.signIn('nobody@test.com', 'secret'),
			).rejects.toBeInstanceOf(UnauthorizedException);
		});

		it('still runs a bcrypt compare for an unknown email, so timing matches a wrong password', async () => {
			managersServiceMock.findOneByEmail.mockResolvedValue(undefined);

			await expect(
				service.signIn('nobody@test.com', 'secret'),
			).rejects.toBeInstanceOf(UnauthorizedException);

			expect(hashCryptMock.isMatchCompare).toHaveBeenCalledWith(
				'secret',
				'dummy-hash',
			);
			expect(
				notificationsServiceMock.sendManagerSignInCode,
			).not.toHaveBeenCalled();
		});

		it('refuses a wrong password', async () => {
			managersServiceMock.findOneByEmail.mockResolvedValue(buildManager());
			hashCryptMock.isMatchCompare.mockResolvedValue(false);

			await expect(
				service.signIn('main@test.com', 'wrong'),
			).rejects.toBeInstanceOf(UnauthorizedException);
		});

		it('refuses an inactive manager', async () => {
			managersServiceMock.findOneByEmail.mockResolvedValue(
				buildManager({ isActive: false }),
			);

			await expect(
				service.signIn('main@test.com', 'secret'),
			).rejects.toBeInstanceOf(ForbiddenException);
		});

		it('refuses a soft deleted manager', async () => {
			managersServiceMock.findOneByEmail.mockResolvedValue(
				buildManager({ softDelete: { isDeleted: true } }),
			);

			await expect(
				service.signIn('main@test.com', 'secret'),
			).rejects.toBeInstanceOf(ForbiddenException);
		});

		it('refuses a disabled manager with a wrong password as 401, not 403', async () => {
			managersServiceMock.findOneByEmail.mockResolvedValue(
				buildManager({ isActive: false }),
			);
			hashCryptMock.isMatchCompare.mockResolvedValue(false);

			await expect(
				service.signIn('main@test.com', 'wrong'),
			).rejects.toBeInstanceOf(UnauthorizedException);
		});
	});

	describe('validateSignInCode', () => {
		it('returns null when the code does not match', async () => {
			managersServiceMock.findByIdOrFail.mockResolvedValue(buildManager());
			codesServiceMock.validateManagerSignIn.mockResolvedValue(false);

			await expect(
				service.validateSignInCode(MANAGER_ID, 'WRONG1'),
			).resolves.toBeNull();

			expect(authorizationTokenMock.generateToken).not.toHaveBeenCalled();
		});

		it('issues a validated token when the code matches', async () => {
			managersServiceMock.findByIdOrFail.mockResolvedValue(buildManager());
			codesServiceMock.validateManagerSignIn.mockResolvedValue(true);

			const login = await service.validateSignInCode(MANAGER_ID, 'RIGHT1');

			expect(login.authToken).toBe('signed-token');

			const [payload] = authorizationTokenMock.generateToken.mock.calls[0];

			expect(payload.isSignInValidated).toBe(true);
		});
	});

	describe('sendRecoverPasswordCode', () => {
		it('stays silent for an unknown email, so emails cannot be enumerated', async () => {
			jest
				.spyOn(service['_logger'], 'warn')
				.mockImplementation(() => undefined);

			managersServiceMock.findOneByEmail.mockResolvedValue(undefined);

			await expect(
				service.sendRecoverPasswordCode('nobody@test.com'),
			).resolves.toBeUndefined();

			expect(
				notificationsServiceMock.sendManagerRecoverPasswordCode,
			).not.toHaveBeenCalled();
		});

		it('emails the code for a known, active manager', async () => {
			managersServiceMock.findOneByEmail.mockResolvedValue(buildManager());

			await service.sendRecoverPasswordCode('main@test.com');

			expect(
				notificationsServiceMock.sendManagerRecoverPasswordCode,
			).toHaveBeenCalled();
		});

		it('does not wait for, or surface, a failed email send', async () => {
			jest
				.spyOn(service['_logger'], 'error')
				.mockImplementation(() => undefined);

			managersServiceMock.findOneByEmail.mockResolvedValue(buildManager());
			notificationsServiceMock.sendManagerRecoverPasswordCode.mockRejectedValue(
				new Error('SMTP down'),
			);

			await expect(
				service.sendRecoverPasswordCode('main@test.com'),
			).resolves.toBeUndefined();

			await new Promise((resolve) => setImmediate(resolve));

			expect(service['_logger'].error).toHaveBeenCalled();
		});
	});

	describe('recoverPassword', () => {
		it('refuses an invalid code without saying whether the email exists', async () => {
			managersServiceMock.findOneByEmail.mockResolvedValue(buildManager());
			codesServiceMock.validateManagerRecoverPassword.mockResolvedValue(false);

			const promise: Promise<void> = service.recoverPassword({
				email: 'main@test.com',
				codeValue: 'WRONG1',
				newPassword: 'newsecret',
			});

			await expect(promise).rejects.toBeInstanceOf(BadRequestException);
			await expect(promise).rejects.toThrow(
				new BadRequestException('Invalid recover password code'),
			);

			expect(managersServiceMock.updatePassword).not.toHaveBeenCalled();
		});

		it('refuses an unknown email with the same message as an invalid code', async () => {
			managersServiceMock.findOneByEmail.mockResolvedValue(undefined);

			const promise: Promise<void> = service.recoverPassword({
				email: 'nobody@test.com',
				codeValue: 'WHATEVER',
				newPassword: 'newsecret',
			});

			await expect(promise).rejects.toBeInstanceOf(BadRequestException);
			await expect(promise).rejects.toThrow(
				new BadRequestException('Invalid recover password code'),
			);

			expect(
				codesServiceMock.validateManagerRecoverPassword,
			).not.toHaveBeenCalled();
			expect(managersServiceMock.updatePassword).not.toHaveBeenCalled();
		});

		it.each([
			['no code was ever requested', new NotFoundException('Code not found!')],
			['the code expired', new BadRequestException('Code expired!')],
		])(
			'answers exactly like an unknown email when %s',
			async (_: string, codesError: Error) => {
				managersServiceMock.findOneByEmail.mockResolvedValue(buildManager());
				codesServiceMock.validateManagerRecoverPassword.mockRejectedValue(
					codesError,
				);

				const promise: Promise<void> = service.recoverPassword({
					email: 'main@test.com',
					codeValue: 'WHATEVER',
					newPassword: 'newsecret',
				});

				await expect(promise).rejects.toBeInstanceOf(BadRequestException);
				await expect(promise).rejects.toThrow(
					new BadRequestException('Invalid recover password code'),
				);

				expect(managersServiceMock.updatePassword).not.toHaveBeenCalled();
			},
		);

		it('sets the new password when the code matches', async () => {
			managersServiceMock.findOneByEmail.mockResolvedValue(buildManager());
			codesServiceMock.validateManagerRecoverPassword.mockResolvedValue(true);

			await service.recoverPassword({
				email: 'main@test.com',
				codeValue: 'RIGHT1',
				newPassword: 'newsecret',
			});

			expect(managersServiceMock.updatePassword).toHaveBeenCalledWith(
				MANAGER_ID,
				'newsecret',
			);
		});
	});
});
