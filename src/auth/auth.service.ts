import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import AuthorizationToken from '../config/authorization/authorization-token';
import HashCrypt from '../config/hash-crypt/hash-crypt';
import CreateUserDto from '../users/interfaces/dto/createUser.dto';
import { IUser } from '../users/interfaces/user.interface';
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
		const user: IUser | undefined =
			await this._usersService.findOneByEmail(email);

		if (!user) {
			throw new BadRequestException('User not found!');
		}

		const isPasswordMatch: boolean = await this._hashCrypt.isMatchCompare(
			password,
			user?.password,
		);

		if (!isPasswordMatch) {
			throw new UnauthorizedException();
		}

		return this._usersService.getUserEntityFromUserSchema(user);
	}

	public async signUp(createUserDto: CreateUserDto): Promise<IUserEntity> {
		return this._usersService.signUp(createUserDto);
	}

	// #endregion Public Methods
}
