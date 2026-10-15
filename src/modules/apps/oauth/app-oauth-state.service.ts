import { createHmac } from 'crypto';

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import AppsEnum from '../interfaces/apps.enum';

const PURPOSE: string = 'APP_OAUTH_STATE';
const EXPIRES_IN: string = '10m';

export interface IAppOAuthState {
	ownerUserId: string;
	employeeId: string | null;
	appId: AppsEnum.App;
}

/**
 * Signs the `state` that rides through the third party and comes back to the
 * public callback. It is signed with a secret *derived* from JWT_SECRET_KEY, so
 * a login token can never be accepted as state and a state can never be accepted
 * as a login token by the global AuthGuard.
 */
@Injectable()
export class AppOAuthStateService {
	constructor(private readonly _jwtService: JwtService) {}

	public async sign(state: IAppOAuthState): Promise<string> {
		return await this._jwtService.signAsync(
			{ ...state, purpose: PURPOSE },
			{ secret: this._secret(), expiresIn: EXPIRES_IN },
		);
	}

	public async verify(
		token: string,
		expectedAppId: AppsEnum.App,
	): Promise<IAppOAuthState> {
		const payload: IAppOAuthState & { purpose?: string } =
			await this._jwtService.verifyAsync(token, { secret: this._secret() });

		if (payload.purpose !== PURPOSE || payload.appId !== expectedAppId) {
			throw new Error('Invalid OAuth state.');
		}

		return {
			ownerUserId: payload.ownerUserId,
			employeeId: payload.employeeId ?? null,
			appId: payload.appId,
		};
	}

	private _secret(): string {
		return createHmac('sha256', process.env.JWT_SECRET_KEY ?? '')
			.update('apps-oauth-state')
			.digest('hex');
	}
}
