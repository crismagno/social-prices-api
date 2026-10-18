import { JwtService } from '@nestjs/jwt';

import { GoogleContactsOAuthState } from './google-contacts.oauth-state';

const STATE = { ownerUserId: 'u1', employeeId: 'e1' };

describe('GoogleContactsOAuthState', () => {
	const jwt = new JwtService({});
	const state = new GoogleContactsOAuthState(jwt);

	beforeAll(() => {
		process.env.JWT_SECRET_KEY = 'test-login-secret';
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('round-trips the state', async () => {
		await expect(state.verify(await state.sign(STATE))).resolves.toEqual(STATE);
	});

	it('normalises a missing employee id to null', async () => {
		const token = await state.sign({
			ownerUserId: 'u1',
			employeeId: undefined,
		});

		await expect(state.verify(token)).resolves.toEqual({
			ownerUserId: 'u1',
			employeeId: null,
		});
	});

	it('rejects an expired state (valid for 10 minutes)', async () => {
		const realNow = Date.now();
		const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(realNow);
		const token = await state.sign(STATE);

		nowSpy.mockReturnValue(realNow + 11 * 60 * 1000);

		await expect(state.verify(token)).rejects.toThrow();
	});

	it('rejects a tampered state', async () => {
		const token = await state.sign(STATE);

		await expect(state.verify(`${token}x`)).rejects.toThrow();
	});

	it('rejects a login-style token signed with the plain JWT secret', async () => {
		const loginToken = await jwt.signAsync(
			{ _id: 'u1', ...STATE, purpose: 'GOOGLE_CONTACTS_OAUTH_STATE' },
			{ secret: 'test-login-secret' },
		);

		await expect(state.verify(loginToken)).rejects.toThrow();
	});

	it('rejects a state signed for another purpose with the same derived secret', async () => {
		const { createHmac } = require('crypto');
		const secret = createHmac('sha256', 'test-login-secret')
			.update('google-contacts-oauth-state')
			.digest('hex');
		const other = await jwt.signAsync(
			{ ...STATE, purpose: 'SOMETHING_ELSE' },
			{ secret, expiresIn: '10m' },
		);

		await expect(state.verify(other)).rejects.toThrow();
	});
});
