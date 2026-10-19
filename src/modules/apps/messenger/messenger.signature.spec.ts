import { createHmac } from 'crypto';

import {
	isValidMetaSignature,
	isValidVerifyToken,
} from './messenger.signature';

const SECRET = 'app-secret';

const sign = (body: string, secret = SECRET): string =>
	`sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;

describe('isValidMetaSignature', () => {
	const body = JSON.stringify({ object: 'page', entry: [] });

	it('accepts the signature Meta makes with the app secret', () => {
		expect(isValidMetaSignature(Buffer.from(body), sign(body), SECRET)).toBe(
			true,
		);
	});

	it('refuses a body that was changed after it was signed', () => {
		expect(
			isValidMetaSignature(Buffer.from(body + ' '), sign(body), SECRET),
		).toBe(false);
	});

	it('refuses a signature made with another secret', () => {
		expect(
			isValidMetaSignature(Buffer.from(body), sign(body, 'other'), SECRET),
		).toBe(false);
	});

	it.each([undefined, '', 'sha256=', 'sha256=zz', 'md5=abc', 123, null])(
		'refuses a missing or malformed header (%p)',
		(header) => {
			expect(isValidMetaSignature(Buffer.from(body), header, SECRET)).toBe(
				false,
			);
		},
	);

	it('refuses everything when there is no body or no secret configured', () => {
		expect(isValidMetaSignature(undefined, sign(body), SECRET)).toBe(false);
		expect(isValidMetaSignature(Buffer.from(body), sign(body, ''), '')).toBe(
			false,
		);
	});
});

describe('isValidVerifyToken', () => {
	it('matches only the exact token that was configured', () => {
		expect(isValidVerifyToken('abc123', 'abc123')).toBe(true);
		expect(isValidVerifyToken('abc124', 'abc123')).toBe(false);
		expect(isValidVerifyToken('abc12', 'abc123')).toBe(false);
	});

	it('never matches when nothing is configured or nothing was sent', () => {
		expect(isValidVerifyToken('', '')).toBe(false);
		expect(isValidVerifyToken(undefined, 'abc')).toBe(false);
		expect(isValidVerifyToken('abc', undefined)).toBe(false);
	});
});
