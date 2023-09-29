import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { AuthorizationTokenJwtConstants } from './authorization-token.enum';

@Injectable()
export default class AuthorizationToken {
	//#region Constructor

	constructor(private _jwtService: JwtService) {}

	//#endregion

	//#region Public Methods

	public async generateToken(payload: any): Promise<string> {
		return await this._jwtService.signAsync(payload);
	}

	public async getToken(token: string): Promise<any> {
		return await this._jwtService.verifyAsync(token, {
			secret: AuthorizationTokenJwtConstants.secret(),
		});
	}

	//#endregion
}
