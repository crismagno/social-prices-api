import { createHmac } from 'crypto';

import {
	isValidWhatsappSignature,
	isValidWhatsappVerifyToken,
} from './whatsapp.signature';

const sign = (body: Buffer, secret: string): string =>
	`sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;

describe('isValidWhatsappSignature', () => {
	const body = Buffer.from('{"object":"whatsapp_business_account"}');

	it('accepts a body signed with any of the secrets', () => {
		expect(isValidWhatsappSignature(body, sign(body, 'a'), ['a', 'b'])).toBe(
			true,
		);
		expect(isValidWhatsappSignature(body, sign(body, 'b'), ['a', 'b'])).toBe(
			true,
		);
	});

	it('refuses a wrong signature, a changed body, a missing header or no secret at all', () => {
		expect(isValidWhatsappSignature(body, sign(body, 'x'), ['a'])).toBe(false);
		expect(
			isValidWhatsappSignature(Buffer.from('{}'), sign(body, 'a'), ['a']),
		).toBe(false);
		expect(isValidWhatsappSignature(body, undefined, ['a'])).toBe(false);
		expect(isValidWhatsappSignature(undefined, sign(body, 'a'), ['a'])).toBe(
			false,
		);
		expect(isValidWhatsappSignature(body, sign(body, 'a'), [undefined])).toBe(
			false,
		);
	});
});

describe('isValidWhatsappVerifyToken', () => {
	it('only accepts the configured token', () => {
		expect(isValidWhatsappVerifyToken('abc', 'abc')).toBe(true);
		expect(isValidWhatsappVerifyToken('abd', 'abc')).toBe(false);
		expect(isValidWhatsappVerifyToken('abc', undefined)).toBe(false);
		expect(isValidWhatsappVerifyToken(undefined, 'abc')).toBe(false);
	});
});
