import { createHmac } from 'crypto';

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

const PURPOSE: string = 'INSTAGRAM_OAUTH_STATE';
const EXPIRES_IN: string = '10m';

export interface IInstagramOAuthState {
	ownerUserId: string;
	employeeId: string | null;
}

/**
 * The `state` that rides through Instagram and comes back to the public callback.
 * Signed with a secret of its own, so no login token or other app's state is
 * ever accepted here, and this one is never accepted anywhere else.
 */
@Injectable()
export class InstagramOAuthState {
	constructor(private readonly _jwtService: JwtService) {}

	public async sign(state: {
		ownerUserId: string;
		employeeId?: string | null;
	}): Promise<string> {
		return await this._jwtService.signAsync(
			{ ...state, purpose: PURPOSE },
			{ secret: this._secret(), expiresIn: EXPIRES_IN },
		);
	}

	public async verify(token: string): Promise<IInstagramOAuthState> {
		const payload: IInstagramOAuthState & { purpose?: string } =
			await this._jwtService.verifyAsync(token, { secret: this._secret() });

		if (payload.purpose !== PURPOSE) {
			throw new Error('Invalid OAuth state.');
		}

		return {
			ownerUserId: payload.ownerUserId,
			employeeId: payload.employeeId ?? null,
		};
	}

	private _secret(): string {
		return createHmac('sha256', process.env.JWT_SECRET_KEY ?? '')
			.update('instagram-oauth-state')
			.digest('hex');
	}
}
