/** The longest message either side can send: what the central inbox takes as a reply. */
export const STORE_CHAT_MAX_TEXT: number = 1000;

/** How many stores a customer account can start talking to within the window below. */
export const STORE_CHAT_DAILY_NEW_CONVERSATIONS: number = 10;

export const STORE_CHAT_WINDOW_MS: number = 24 * 60 * 60 * 1000;

export const STORE_CHAT_CODES = {
	NO_ACCOUNT: 'CUSTOMER_HAS_NO_ACCOUNT',
	DAILY_LIMIT: 'STORE_CHAT_DAILY_LIMIT',
	OWN_STORE: 'STORE_CHAT_OWN_STORE',
} as const;

/** One conversation per customer account per store. */
export const storeChatContactKey = (
	customerUserId: string,
	storeId: string,
): string => `${customerUserId}:${storeId}`;
