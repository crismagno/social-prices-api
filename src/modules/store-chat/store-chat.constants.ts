/** The longest message either side can send: what the central inbox takes as a reply. */
export const STORE_CHAT_MAX_TEXT: number = 1000;

/** The largest file or recording either side can send. */
export const STORE_CHAT_MAX_UPLOAD_BYTES: number = 16 * 1024 * 1024;

/** How many stores a customer account can start talking to within the window below. */
export const STORE_CHAT_DAILY_NEW_CONVERSATIONS: number = 10;

export const STORE_CHAT_WINDOW_MS: number = 24 * 60 * 60 * 1000;

export const STORE_CHAT_CODES = {
	NO_ACCOUNT: 'CUSTOMER_HAS_NO_ACCOUNT',
	DAILY_LIMIT: 'STORE_CHAT_DAILY_LIMIT',
	OWN_STORE: 'STORE_CHAT_OWN_STORE',
	NOT_YOUR_MESSAGE: 'STORE_CHAT_NOT_YOUR_MESSAGE',
	FILE_TOO_LARGE: 'STORE_CHAT_FILE_TOO_LARGE',
} as const;

/** One conversation per customer account per store. */
export const storeChatContactKey = (
	customerUserId: string,
	storeId: string,
): string => `${customerUserId}:${storeId}`;
