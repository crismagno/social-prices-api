import { createHmac } from 'crypto';

import {
	isValidInstagramSignature,
	isValidInstagramVerifyToken,
} from './instagram.signature';

const SECRET = 'instagram-app-secret';
const OTHER = 'meta-app-secret';

const sign = (body: string, secret = SECRET): string =>
	`sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;

describe('isValidInstagramSignature', () => {
	const body = JSON.stringify({ object: 'instagram', entry: [] });

	it('accepts the signature Meta makes with the app secret', () => {
		expect(
			isValidInstagramSignature(Buffer.from(body), sign(body), [SECRET]),
		).toBe(true);
	});

	it('accepts a signature made with any of the secrets this system has', () => {
		expect(
			isValidInstagramSignature(Buffer.from(body), sign(body, OTHER), [
				SECRET,
				OTHER,
			]),
		).toBe(true);
	});

	it('refuses a body that was changed after it was signed', () => {
		expect(
			isValidInstagramSignature(Buffer.from(body + ' '), sign(body), [SECRET]),
		).toBe(false);
	});

	it('refuses a signature made with a secret that is not ours', () => {
		expect(
			isValidInstagramSignature(Buffer.from(body), sign(body, 'stranger'), [
				SECRET,
				OTHER,
			]),
		).toBe(false);
	});

	it.each([undefined, '', 'sha256=', 'sha256=zz', 'md5=abc', 123, null])(
		'refuses a missing or malformed header (%p)',
		(header) => {
			expect(
				isValidInstagramSignature(Buffer.from(body), header, [SECRET]),
			).toBe(false);
		},
	);

	it('refuses everything when there is no body or no secret configured', () => {
		expect(isValidInstagramSignature(undefined, sign(body), [SECRET])).toBe(
			false,
		);
		expect(
			isValidInstagramSignature(Buffer.from(body), sign(body, ''), [
				undefined,
				'',
			]),
		).toBe(false);
	});
});

describe('isValidInstagramVerifyToken', () => {
	it('matches only the exact token that was configured', () => {
		expect(isValidInstagramVerifyToken('abc123', 'abc123')).toBe(true);
		expect(isValidInstagramVerifyToken('abc124', 'abc123')).toBe(false);
		expect(isValidInstagramVerifyToken('abc12', 'abc123')).toBe(false);
	});

	it('never matches when nothing is configured or nothing was sent', () => {
		expect(isValidInstagramVerifyToken('', '')).toBe(false);
		expect(isValidInstagramVerifyToken(undefined, 'abc')).toBe(false);
		expect(isValidInstagramVerifyToken('abc', undefined)).toBe(false);
	});
});
