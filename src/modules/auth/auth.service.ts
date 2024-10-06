import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';

import AuthorizationToken from '../../infra/authorization/authorization-token';
import HashCrypt from '../../infra/hash-crypt/hash-crypt';
import { IEmployee } from '../employees/interfaces/employee.interface';
import EmployeesEnum from '../employees/interfaces/employees.enum';
import { ISearchEmployee } from '../employees/interfaces/employees.types';
import { NotificationsService } from '../notifications/notifications.service';
import CreateUserDto from '../users/interfaces/dto/createUser.dto';
import UserEntity from '../users/interfaces/user.entity';
import { IUser } from '../users/interfaces/user.interface';
import { IUserEntity } from '../users/interfaces/users.types';
import { UsersService } from '../users/users.service';
import { IAuthLogin, IAuthPayload } from './interfaces/auth.types';

@Injectable()
export class AuthService {
	//#region Private Properties

	private readonly _logger: Logger;

	//#endregion

	//#region Constructor

	constructor(
		private _usersService: UsersService,
		private readonly _notificationsService: NotificationsService,
		private readonly _hashCrypt: HashCrypt,
		private readonly _authorizationToken: AuthorizationToken,
	) {
		this._logger = new Logger(AuthService.name);
	}

	//#endregion

	// #region Public Methods

	public async signIn(
		emailOrUsername: string,
		password: string,
	): Promise<IAuthLogin> {
		const user: IUser =
			await this._usersService.findOneByEmailOrUsernameOrFail(emailOrUsername);

		const isPasswordMatch: boolean = await this._hashCrypt.isMatchCompare(
			password,
			user.password,
		);

		if (!isPasswordMatch) {
			throw new UnauthorizedException();
		}

		await this._notificationsService.sendSignInCode(user);

		return this.getAuthLogin(user);
	}

	public async signUp(createUserDto: CreateUserDto): Promise<IUserEntity> {
		return this._usersService.signUp(createUserDto);
	}

	public async validateSignInCode(
		userId: string,
		value: string,
	): Promise<boolean> {
		return this._usersService.validateSignInCode(userId, value);
	}

	public async searchEmployees(
		emailOrUsername: string,
	): Promise<ISearchEmployee[]> {
		return await this._usersService.employeesService.searchEmployees(
			emailOrUsername,
		);
	}

	public async signInEmployee(
		username: string,
		password: string,
	): Promise<IUserEntity> {
		const employee: IEmployee =
			await this._usersService.employeesService.findByUsernameOrFail(username);

		const user: IUser = await this._usersService.findOneByIdOrFail(
			employee.userId.toString(),
		);

		const isPasswordMatch: boolean = await this._hashCrypt.isMatchCompare(
			password,
			employee.password,
		);

		if (!isPasswordMatch) {
			throw new UnauthorizedException();
		}

		await this._notificationsService.sendSignInEmployeeCode(
			user,
			employee,
			password,
		);

		return this._usersService.getUserEntityWithToken(user, employee._id);
	}

	public async validateSignInEmployeeCode(
		userId: string,
		employeeId: string,
		value: string,
	): Promise<boolean> {
		const isValidatedSignInCode: boolean =
			await this._usersService.codesService.validateSignInEmployee(
				userId,
				value,
				employeeId,
			);

		if (!isValidatedSignInCode) {
			return false;
		}

		const employee: IEmployee =
			await this._usersService.employeesService.findByIdOrFail(employeeId);

		if (employee.status === EmployeesEnum.Status.ACTIVE) {
			return true;
		}

		await this._usersService.employeesService.findByIdAndActive(employeeId);

		return true;
	}

	public async getAuthLogin(
		user: IUser,
		employeeId?: string,
	): Promise<IAuthLogin> {
		const employee: IEmployee = employeeId
			? await this._usersService.employeesService.findByIdOrFail(employeeId)
			: await this._usersService.employeesService.findAdminByUserId(user._id);

		const payload: IAuthPayload = {
			_id: user._id,
			uid: user.uid,
			email: user.email,
			employeeId: employee._id,
		};

		const authToken: string =
			await this._authorizationToken.generateToken(payload);

		return {
			authToken,
			employee,
			user: new UserEntity(user),
		};
	}

	// #endregion
}
