import { Injectable } from '@nestjs/common';

import AuthorizationToken from '../config/authorization/authorization-token';
import HashCrypt from '../config/hash-crypt/hash-crypt';
import CreateUserDto from '../users/interfaces/dto/createUser.dto';
import { IUserEntity } from '../users/interfaces/users.types';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
	constructor(
		private _usersService: UsersService,
		private _authorizationToken: AuthorizationToken,
		private _hashCrypt: HashCrypt,
	) {}

	// #region Public Methods

	public async signIn(email: string, password: string): Promise<IUserEntity> {
		return this._usersService.signIn(email, password);
	}

	public async signUp(createUserDto: CreateUserDto): Promise<IUserEntity> {
		return this._usersService.signUp(createUserDto);
	}

	// #endregion Public Methods
}
