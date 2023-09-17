import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { IUser } from '../users/interfaces/user.interface';
import { UsersService } from '../users/users.service';
import { IAuthPayload } from './interfaces/auth.types';
import CreateAuthDto from './interfaces/dto/createAuth.dto';

@Injectable()
export class AuthService {
	constructor(
		private _usersService: UsersService,
		private _jwtService: JwtService,
	) {}

	// #region Public Methods

	public async signIn(
		username: string,
		password: string,
	): Promise<{
		accessToken: string;
	}> {
		const user = await this._usersService.findOneByUsername(username);

		if (user?.password !== password) {
			throw new UnauthorizedException();
		}

		const payload: IAuthPayload = { uid: user.uid, username: user.username };

		return {
			accessToken: await this._jwtService.signAsync(payload),
		};
	}

	public async signUp(createAuthDto: CreateAuthDto): Promise<IUser> {
		return this._usersService.signUp(createAuthDto);
	}

	// #endregion Public Methods
}
