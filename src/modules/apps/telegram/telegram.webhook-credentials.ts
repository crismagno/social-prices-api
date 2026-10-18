import { createHash, randomBytes, timingSafeEqual } from 'crypto';

export interface IWebhookCredentials {
	/** Part of the webhook URL: tells which connection a request is for. */
	key: string;
	/** Sent to Telegram once; Telegram echoes it back on every request. */
	secret: string;
	/** All that is kept of the secret. */
	secretHash: string;
}

export const hashWebhookSecret = (secret: string): string =>
	createHash('sha256').update(secret).digest('hex');

// base64url only has A-Z a-z 0-9 _ -, exactly what Telegram allows in a secret_token.
export const generateWebhookCredentials = (): IWebhookCredentials => {
	const secret: string = randomBytes(32).toString('base64url');

	return {
		key: randomBytes(16).toString('base64url'),
		secret,
		secretHash: hashWebhookSecret(secret),
	};
};

/** Compares in constant time, and says false for anything that is not a string. */
export const webhookSecretMatches = (
	received: unknown,
	storedHash: string,
): boolean => {
	if (typeof received !== 'string' || !received || !storedHash) {
		return false;
	}

	const receivedHash: Buffer = Buffer.from(hashWebhookSecret(received));
	const expected: Buffer = Buffer.from(storedHash);

	return (
		receivedHash.length === expected.length &&
		timingSafeEqual(receivedHash, expected)
	);
};
