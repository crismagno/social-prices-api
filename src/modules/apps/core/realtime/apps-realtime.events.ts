/** The socket.io events of the apps' inboxes, shared by the server and (by hand) the web. */
export const AppsRealtimeEvents = {
	/** Client to server: "send me what happens to my apps". Carries the login token. */
	SUBSCRIBE: 'apps:subscribe',
	/** Client to server: "stop". Sent on logout, so the next account in this browser hears nothing of the last. */
	UNSUBSCRIBE: 'apps:unsubscribe',
	/** Server to client: something changed in an app's inbox. Carries no message content. */
	INBOX_UPDATED: 'apps:inbox-updated',
} as const;

export const APPS_ROOM_PREFIX: string = 'apps:owner:';

/** One room per account: only its own users hear what happens in its inboxes. */
export const appsRoomOf = (ownerUserId: string): string =>
	`${APPS_ROOM_PREFIX}${ownerUserId}`;
