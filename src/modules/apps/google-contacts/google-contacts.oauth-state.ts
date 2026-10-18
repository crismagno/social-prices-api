import { createHmac } from 'crypto';

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

const PURPOSE: string = 'GOOGLE_CONTACTS_OAUTH_STATE';
const EXPIRES_IN: string = '10m';

export interface IGoogleContactsOAuthState {
	ownerUserId: string;
	employeeId: string | null;
}

/**
 * The `state` that rides through Google and comes back to the public callback.
 * It is signed with a secret derived from JWT_SECRET_KEY and this app's own
 * label, so a login token is never accepted as state, a state is never accepted
 * as a login token, and no other app's state is valid here.
 */
@Injectable()
export class GoogleContactsOAuthState {
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

	public async verify(token: string): Promise<IGoogleContactsOAuthState> {
		const payload: IGoogleContactsOAuthState & { purpose?: string } =
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
			.update('google-contacts-oauth-state')
			.digest('hex');
	}
}
