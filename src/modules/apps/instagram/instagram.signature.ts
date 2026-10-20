import { createHmac, timingSafeEqual } from 'crypto';

const PREFIX: string = 'sha256=';

/**
 * Every call Meta makes to the webhook is signed with an app secret, over the
 * exact bytes of the body. Which secret depends on the product the webhook was
 * set up under, so any of the secrets this system has is accepted; anything
 * signed by none of them did not come from Meta.
 */
export const isValidInstagramSignature = (
	rawBody: Buffer | undefined,
	header: unknown,
	appSecrets: (string | undefined)[],
): boolean => {
	if (!rawBody || typeof header !== 'string' || !header.startsWith(PREFIX)) {
		return false;
	}

	const received: Buffer = Buffer.from(header.slice(PREFIX.length), 'hex');

	return appSecrets
		.filter((secret: string | undefined) => !!secret)
		.some((secret: string) => {
			const expected: Buffer = createHmac('sha256', secret)
				.update(rawBody)
				.digest();

			return (
				received.length === expected.length &&
				timingSafeEqual(received, expected)
			);
		});
};

/** The token that was typed into the Meta panel, checked when the webhook is registered. */
export const isValidInstagramVerifyToken = (
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
