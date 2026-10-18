import {
	generateWebhookCredentials,
	hashWebhookSecret,
	webhookSecretMatches,
} from './telegram.webhook-credentials';

describe('webhook credentials', () => {
	it('generates a key and a secret Telegram accepts (A-Z a-z 0-9 _ -, up to 256)', () => {
		const { key, secret } = generateWebhookCredentials();

		for (const value of [key, secret]) {
			expect(value).toMatch(/^[A-Za-z0-9_-]+$/);
			expect(value.length).toBeGreaterThanOrEqual(16);
			expect(value.length).toBeLessThanOrEqual(256);
		}
	});

	it('is different every time', () => {
		const a = generateWebhookCredentials();
		const b = generateWebhookCredentials();

		expect(a.key).not.toEqual(b.key);
		expect(a.secret).not.toEqual(b.secret);
	});

	it('returns a hash of the secret, never the secret itself', () => {
		const { secret, secretHash } = generateWebhookCredentials();

		expect(secretHash).toBe(hashWebhookSecret(secret));
		expect(secretHash).not.toContain(secret);
		expect(secretHash).toMatch(/^[0-9a-f]{64}$/);
	});

	it('accepts the right secret and nothing else', () => {
		const { secret, secretHash } = generateWebhookCredentials();

		expect(webhookSecretMatches(secret, secretHash)).toBe(true);
		expect(webhookSecretMatches(`${secret}x`, secretHash)).toBe(false);
		expect(webhookSecretMatches(secret.slice(1), secretHash)).toBe(false);
		expect(webhookSecretMatches('', secretHash)).toBe(false);
	});

	it.each([undefined, null, 42, {}, ['a'], ''])(
		'rejects a missing or malformed header value %p',
		(received) => {
			const { secretHash } = generateWebhookCredentials();

			expect(webhookSecretMatches(received as any, secretHash)).toBe(false);
		},
	);

	it('rejects when there is no stored hash to compare with', () => {
		expect(webhookSecretMatches('anything', undefined as any)).toBe(false);
		expect(webhookSecretMatches('anything', '')).toBe(false);
	});
});
