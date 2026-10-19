import { createHmac, timingSafeEqual } from 'crypto';

const PREFIX: string = 'sha256=';

/**
 * Every call Meta makes to the webhook is signed with the app secret, over the
 * exact bytes of the body. Anything that does not match did not come from Meta.
 */
export const isValidMetaSignature = (
	rawBody: Buffer | undefined,
	header: unknown,
	appSecret: string | undefined,
): boolean => {
	if (
		!rawBody ||
		!appSecret ||
		typeof header !== 'string' ||
		!header.startsWith(PREFIX)
	) {
		return false;
	}

	const received: Buffer = Buffer.from(header.slice(PREFIX.length), 'hex');
	const expected: Buffer = createHmac('sha256', appSecret)
		.update(rawBody)
		.digest();

	return (
		received.length === expected.length && timingSafeEqual(received, expected)
	);
};

/** The token that was typed into the Meta panel, checked when the webhook is registered. */
export const isValidVerifyToken = (
	sent: unknown,
	configured: string | undefined,
): boolean => {
	if (!configured || typeof sent !== 'string') {
		return false;
	}

	const a: Buffer = Buffer.from(sent);
	const b: Buffer = Buffer.from(configured);

	return a.length === b.length && timingSafeEqual(a, b);
};
