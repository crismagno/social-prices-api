import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { AuthorizationTokenJwtConstants } from './authorization-token.enum';

@Injectable()
export default class AuthorizationToken {
	constructor(private _jwtService: JwtService) {}

	public async generateToken(payload: any): Promise<string> {
		return await this._jwtService.signAsync(payload);
	}

	public async getToken(token: string): Promise<any> {
		return await this._jwtService.verifyAsync(token, {
			secret: AuthorizationTokenJwtConstants.secret(),
		});
	}
}
