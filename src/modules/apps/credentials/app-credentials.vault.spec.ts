import { randomBytes } from 'crypto';

import { AppCredentialsVault } from './app-credentials.vault';

describe('AppCredentialsVault', () => {
	const originalKey = process.env.APPS_ENCRYPTION_KEY;

	beforeEach(() => {
		process.env.APPS_ENCRYPTION_KEY = randomBytes(32).toString('base64');
	});

	afterAll(() => {
		process.env.APPS_ENCRYPTION_KEY = originalKey;
	});

	it('round-trips credentials', () => {
		const vault = new AppCredentialsVault();
		const credentials = { accessToken: 'a-1', refreshToken: 'r-1' };

		expect(vault.decrypt(vault.encrypt(credentials))).toEqual(credentials);
	});

	it('never contains the plain token in the stored string', () => {
		const vault = new AppCredentialsVault();

		expect(vault.encrypt({ accessToken: 'super-secret-token' })).not.toContain(
			'super-secret-token',
		);
	});

	it('uses a fresh IV every time', () => {
		const vault = new AppCredentialsVault();

		expect(vault.encrypt({ a: 1 })).not.toEqual(vault.encrypt({ a: 1 }));
	});

	it('rejects a tampered payload', () => {
		const vault = new AppCredentialsVault();
		const [iv, tag, ciphertext] = vault.encrypt({ a: 1 }).split('.');
		const flipped = Buffer.from(ciphertext, 'base64');
		flipped[0] = flipped[0] ^ 0xff;

		expect(() =>
			vault.decrypt([iv, tag, flipped.toString('base64')].join('.')),
		).toThrow();
	});

	it('rejects a malformed payload', () => {
		expect(() => new AppCredentialsVault().decrypt('nope')).toThrow(
			'Malformed encrypted credentials.',
		);
	});

	it('refuses to work without a valid 32-byte key', () => {
		process.env.APPS_ENCRYPTION_KEY = randomBytes(8).toString('base64');

		expect(() => new AppCredentialsVault().encrypt({ a: 1 })).toThrow(
			'APPS_ENCRYPTION_KEY must be 32 bytes, base64 encoded.',
		);

		delete process.env.APPS_ENCRYPTION_KEY;

		expect(() => new AppCredentialsVault().encrypt({ a: 1 })).toThrow(
			'APPS_ENCRYPTION_KEY must be 32 bytes, base64 encoded.',
		);
	});
});
