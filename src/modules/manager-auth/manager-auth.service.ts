import {
	BadRequestException,
	Injectable,
	Logger,
	UnauthorizedException,
} from '@nestjs/common';

import AuthorizationToken from '../../infra/authorization/authorization-token';
import HashCrypt from '../../infra/hash-crypt/hash-crypt';
import AuthEnum from '../auth/interfaces/auth.enum';
import { CodesService } from '../codes/codes.service';
import { assertManagerUsable } from '../managers/interfaces/assert-manager-usable';
import ManagerEntity from '../managers/interfaces/manager.entity';
import { IManager } from '../managers/interfaces/manager.interface';
import { ManagersService } from '../managers/managers.service';
import { NotificationsService } from '../notifications/notifications.service';
import RecoverManagerPasswordDto from './interfaces/dto/recoverManagerPassword.dto';
import {
	IManagerAuthLogin,
	IManagerAuthPayload,
} from './interfaces/manager-auth.types';

@Injectable()
export class ManagerAuthService {
	//#region Private Properties

	private readonly _logger: Logger;

	private readonly _expiresIn: string =
		process.env.MANAGER_JWT_EXPIRES_IN ?? '30d';

	/**
	 * A real bcrypt hash of a throwaway value, built once with the same cost as every
	 * stored password. signIn compares against it when the email is unknown, so an
	 * unknown email takes as long to refuse as a wrong password.
	 */
	private _dummyPasswordHash: Promise<string> | null = null;

	//#endregion

	//#region Constructor

	constructor(
		private readonly _managersService: ManagersService,
		private readonly _codesService: CodesService,
		private readonly _notificationsService: NotificationsService,
		private readonly _hashCrypt: HashCrypt,
		private readonly _authorizationToken: AuthorizationToken,
	) {
		this._logger = new Logger(ManagerAuthService.name);
	}

	//#endregion

	// #region Public Methods

	public async signIn(
		email: string,
		password: string,
	): Promise<IManagerAuthLogin> {
		const manager: IManager = await this._managersService.findOneByEmail(email);

		const isPasswordMatch: boolean = await this._hashCrypt.isMatchCompare(
			password,
			manager ? manager.password : await this._getDummyPasswordHash(),
		);

		if (!manager || !isPasswordMatch) {
			throw new UnauthorizedException();
		}

		this._assertUsable(manager);

		await this._notificationsService.sendManagerSignInCode(manager);

		return await this._buildLogin(manager, false);
	}

	public async validateSignInCode(
		managerId: string,
		codeValue: string,
	): Promise<IManagerAuthLogin | null> {
		const manager: IManager =
			await this._managersService.findByIdOrFail(managerId);

		this._assertUsable(manager);

		const isValid: boolean = await this._codesService.validateManagerSignIn(
			managerId,
			codeValue,
		);

		if (!isValid) {
			return null;
		}

		return await this._buildLogin(manager, true);
	}

	public async getAuthManagerByToken(
		managerId: string,
	): Promise<IManagerAuthLogin> {
		const manager: IManager =
			await this._managersService.findByIdOrFail(managerId);

		this._assertUsable(manager);

		return await this._buildLogin(manager, true);
	}

	/**
	 * Always resolves, even for an email nobody owns, so the panel cannot be used to
	 * enumerate manager emails. The user-side equivalent throws NotFoundException;
	 * that weakness is not repeated here.
	 *
	 * The email is sent without awaiting it: waiting for SMTP only on the known-email
	 * path would make that path measurably slower and give the answer away by timing.
	 */
	public async sendRecoverPasswordCode(email: string): Promise<void> {
		const manager: IManager = await this._managersService.findOneByEmail(email);

		if (!manager || manager.softDelete?.isDeleted || !manager.isActive) {
			this._logger.warn(
				'Recover password requested for an unknown or unusable manager email.',
			);

			return;
		}

		this._notificationsService
			.sendManagerRecoverPasswordCode(manager)
			.catch((error: any) => {
				this._logger.error(
					'Failed to send the manager recover password code.',
					error?.stack ?? error,
				);
			});
	}

	public async recoverPassword(
		recoverManagerPasswordDto: RecoverManagerPasswordDto,
	): Promise<void> {
		const manager: IManager = await this._managersService.findOneByEmail(
			recoverManagerPasswordDto.email,
		);

		if (!manager) {
			throw new BadRequestException('Invalid recover password code');
		}

		// CodesService throws NotFoundException when no code was ever requested and
		// BadRequestException('Code expired!') when it expired. Letting either through
		// would tell an unauthenticated caller that the email belongs to a manager,
		// so every failure collapses into the one message an unknown email gets.
		let isValid: boolean = false;

		try {
			isValid = await this._codesService.validateManagerRecoverPassword(
				manager._id,
				recoverManagerPasswordDto.codeValue,
			);
		} catch {
			isValid = false;
		}

		if (!isValid) {
			throw new BadRequestException('Invalid recover password code');
		}

		await this._managersService.updatePassword(
			manager._id,
			recoverManagerPasswordDto.newPassword,
		);
	}

	// #endregion

	//#region Private Methods

	private _assertUsable(manager: IManager): void {
		assertManagerUsable(manager);
	}

	private _getDummyPasswordHash(): Promise<string> {
		if (!this._dummyPasswordHash) {
			this._dummyPasswordHash = this._hashCrypt.generateHash(
				`dummy-${Date.now()}-${Math.random()}`,
			);
		}

		return this._dummyPasswordHash;
	}

	private async _buildLogin(
		manager: IManager,
		isSignInValidated: boolean,
	): Promise<IManagerAuthLogin> {
		const payload: IManagerAuthPayload = {
			_id: manager._id.toString(),
			email: manager.email,
			level: manager.level,
			isMain: manager.isMain,
			type: AuthEnum.PayloadType.MANAGER,
			isSignInValidated,
		};

		const authToken: string = await this._authorizationToken.generateToken(
			payload,
			{ expiresIn: this._expiresIn },
		);

		return {
			authToken,
			manager: new ManagerEntity(manager),
		};
	}

	//#endregion
}
