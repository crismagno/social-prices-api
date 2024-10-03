import { Injectable, Logger } from '@nestjs/common';

import { ISearchEmployee } from '../employees/interfaces/employees.types';
import CreateUserDto from '../users/interfaces/dto/createUser.dto';
import { IUserEntity } from '../users/interfaces/users.types';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
	//#region Private Properties

	private readonly _logger: Logger;

	//#endregion

	//#region Constructor

	constructor(private _usersService: UsersService) {
		this._logger = new Logger(AuthService.name);
	}

	//#endregion

	// #region Public Methods

	public async signIn(
		emailOrUsername: string,
		password: string,
	): Promise<IUserEntity> {
		return this._usersService.signIn(emailOrUsername, password);
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

	// #endregion
}
