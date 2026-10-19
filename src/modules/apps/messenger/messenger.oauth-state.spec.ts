import { JwtService } from '@nestjs/jwt';

import { GoogleContactsOAuthState } from '../google-contacts/google-contacts.oauth-state';
import { MessengerOAuthState } from './messenger.oauth-state';

describe('MessengerOAuthState', () => {
	const saved = process.env.JWT_SECRET_KEY;
	const jwt = new JwtService({});
	const state = new MessengerOAuthState(jwt);

	beforeAll(() => {
		process.env.JWT_SECRET_KEY = 'jwt-secret-for-tests';
	});

	afterAll(() => {
		process.env.JWT_SECRET_KEY = saved;
	});

	it('brings back who started the login', async () => {
		const token = await state.sign({ ownerUserId: 'u1', employeeId: 'e1' });

		await expect(state.verify(token)).resolves.toEqual({
			ownerUserId: 'u1',
			employeeId: 'e1',
		});
	});

	it('treats a missing employee as none', async () => {
		const token = await state.sign({ ownerUserId: 'u1' });

		await expect(state.verify(token)).resolves.toEqual({
			ownerUserId: 'u1',
			employeeId: null,
		});
	});

	it('refuses a token that was altered', async () => {
		const token = await state.sign({ ownerUserId: 'u1' });

		await expect(state.verify(token.slice(0, -2) + 'xx')).rejects.toBeDefined();
	});

	it("refuses another app's state, and a login token", async () => {
		const google = await new GoogleContactsOAuthState(jwt).sign({
			ownerUserId: 'u1',
		});
		const login = await jwt.signAsync(
			{ ownerUserId: 'u1' },
			{ secret: process.env.JWT_SECRET_KEY },
		);

		await expect(state.verify(google)).rejects.toBeDefined();
		await expect(state.verify(login)).rejects.toBeDefined();
	});

	it('refuses a state that expired', async () => {
		const expired = await jwt.signAsync(
			{ ownerUserId: 'u1', purpose: 'MESSENGER_OAUTH_STATE' },
			{ secret: 'whatever', expiresIn: '-1s' },
		);

		await expect(state.verify(expired)).rejects.toBeDefined();
	});
});
