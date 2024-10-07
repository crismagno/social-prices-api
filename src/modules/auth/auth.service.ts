import { randomUUID } from 'crypto';

import {
	BadRequestException,
	Injectable,
	Logger,
	UnauthorizedException,
} from '@nestjs/common';

import AuthorizationToken from '../../infra/authorization/authorization-token';
import HashCrypt from '../../infra/hash-crypt/hash-crypt';
import PersonEnum from '../../shared/enums/person.enum';
import {
	createNameByEmail,
	createUsernameByEmail,
} from '../../shared/utils/global/global';
import { CodesService } from '../codes/codes.service';
import { EmployeesService } from '../employees/employees.service';
import { IEmployee } from '../employees/interfaces/employee.interface';
import EmployeesEnum from '../employees/interfaces/employees.enum';
import { ISearchEmployee } from '../employees/interfaces/employees.types';
import { NotificationsService } from '../notifications/notifications.service';
import CreateUserDto from '../users/interfaces/dto/createUser.dto';
import UserEntity from '../users/interfaces/user.entity';
import { IUser } from '../users/interfaces/user.interface';
import UsersEnum from '../users/interfaces/users.enum';
import { UsersService } from '../users/users.service';
import {
	IAuthLogin,
	IAuthPayload,
	IAuthUserEmployee,
} from './interfaces/auth.types';

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
		private readonly _employeesService: EmployeesService,
		public readonly _codesService: CodesService,
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

	public async signUp(createUserDto: CreateUserDto): Promise<IAuthLogin> {
		try {
			const findUserByEmail: IUser | undefined =
				await this._usersService.findOneByEmail(createUserDto.email);

			/**
			 * This part is when user tries to create a new user by Google
			 */
			if (findUserByEmail && createUserDto.authProvider) {
				await this._notificationsService.sendSignInCode(findUserByEmail);

				return await this.getAuthLogin(findUserByEmail);
			} else if (findUserByEmail) {
				this._logger.warn('signUp', createUserDto);
				throw new BadRequestException('User credentials error.');
			}

			const hashPassword: string = await this._hashCrypt.generateHash(
				createUserDto.password,
			);

			const now: Date = new Date();

			const username: string = createUsernameByEmail(createUserDto.email);

			const name: string = createNameByEmail(createUserDto.email);

			const user: IUser = await this._usersService.insert({
				email: createUserDto.email,
				username,
				password: hashPassword,
				authProvider:
					createUserDto.authProvider ?? UsersEnum.Provider.SOCIAL_PRICES,
				phoneNumbers: createUserDto.phoneNumbers ?? [],
				status: UsersEnum.Status.PENDING,
				uid: createUserDto.uid ?? randomUUID(),
				avatar: createUserDto.avatar,
				extraDataProvider: createUserDto.extraDataProvider,
				addresses: [],
				name,
				birthDate: null,
				gender: PersonEnum.Gender.OTHER,
				about: createUserDto.about,
				createdAt: now,
				updatedAt: now,
				type: createUserDto.type,
			});

			await this._notificationsService.sendSignInCode(user);

			await this._employeesService.create(
				null,
				{
					about: createUserDto.about,
					addresses: [],
					birthDate: null,
					email: createUserDto.email,
					gender: PersonEnum.Gender.OTHER,
					level: EmployeesEnum.Level.ADMIN,
					name,
					password: createUserDto.password,
					phoneNumbers: createUserDto.phoneNumbers ?? [],
					status: EmployeesEnum.Status.PENDING,
					tagsIds: [],
					username,
					avatar: createUserDto.avatar,
					isMain: true,
				},
				user._id,
			);

			return await this.getAuthLogin(user);
		} catch (error: any) {
			this._logger.error(error);
			throw error;
		}
	}

	public async validateSignInCode(
		userId: string,
		value: string,
	): Promise<boolean> {
		const isValidatedSignInCode: boolean =
			await this._codesService.validateSignIn(userId, value);

		if (!isValidatedSignInCode) {
			return false;
		}

		const user: IUser = await this._usersService.findOneByIdOrFail(userId);

		if (user.status === UsersEnum.Status.ACTIVE) {
			return true;
		}

		await this._usersService.findByIdAndActive(userId);

		await this._employeesService.activeAdminByUserId(userId);

		return true;
	}

	public async searchEmployees(
		emailOrUsername: string,
	): Promise<ISearchEmployee[]> {
		return await this._employeesService.searchEmployees(emailOrUsername);
	}

	public async signInEmployee(
		username: string,
		password: string,
	): Promise<IAuthLogin> {
		const employee: IEmployee =
			await this._employeesService.findByUsernameOrFail(username);

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

		return this.getAuthLogin(user, employee._id);
	}

	public async validateSignInEmployeeCode(
		userId: string,
		employeeId: string,
		value: string,
	): Promise<boolean> {
		const isValidatedSignInCode: boolean =
			await this._codesService.validateSignInEmployee(
				userId,
				value,
				employeeId,
			);

		if (!isValidatedSignInCode) {
			return false;
		}

		const employee: IEmployee =
			await this._employeesService.findByIdOrFail(employeeId);

		if (employee.status === EmployeesEnum.Status.ACTIVE) {
			return true;
		}

		await this._employeesService.findByIdAndActive(employeeId);

		return true;
	}

	public async getAuthLogin(
		user: IUser,
		employeeId?: string,
	): Promise<IAuthLogin> {
		const employee: IEmployee = employeeId
			? await this._employeesService.findByIdOrFail(employeeId)
			: await this._employeesService.findAdminByUserId(user._id);

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

	public async getAuthUserEmployee(
		userId: string,
		employeeId: string,
	): Promise<IAuthUserEmployee> {
		const user: IUser = await this._usersService.findOneByIdOrFail(userId);

		const employee: IEmployee =
			await this._employeesService.findByIdOrFail(employeeId);

		return {
			employee,
			user: new UserEntity(user),
		};
	}

	public async getAuthLoginByToken(
		userId: string,
		employeeId: string,
	): Promise<IAuthLogin> {
		const user: IUser = await this._usersService.findOneByIdOrFail(userId);

		const employee: IEmployee =
			await this._employeesService.findByIdOrFail(employeeId);

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
