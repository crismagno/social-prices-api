export interface IGoogleCredentials {
	accessToken: string;
	refreshToken: string | null;
}

export interface IGoogleTokenResponse {
	accessToken: string;
	refreshToken: string | null;
	expiresAt: Date;
	scopes: string[];
}

export class GoogleInvalidGrantError extends Error {
	constructor() {
		super('Google rejected the refresh token (invalid_grant).');
	}
}

export class GooglePeopleApiError extends Error {
	constructor(
		public readonly status: number,
		public readonly reason: string,
		public readonly googleMessage: string,
	) {
		super(
			`People API error ${status}${reason ? ` (${reason})` : ''}${
				googleMessage ? `: ${googleMessage}` : ''
			}`,
		);
	}
}

export interface IGooglePerson {
	resourceName: string;
	metadata?: { deleted?: boolean };
	names?: { displayName?: string; metadata?: { primary?: boolean } }[];
	emailAddresses?: { value?: string; metadata?: { primary?: boolean } }[];
	phoneNumbers?: {
		value?: string;
		type?: string;
		metadata?: { primary?: boolean };
	}[];
	birthdays?: {
		date?: { year?: number; month?: number; day?: number };
		metadata?: { primary?: boolean };
	}[];
	biographies?: { value?: string; metadata?: { primary?: boolean } }[];
}

export interface IGoogleConnectionsPage {
	connections: IGooglePerson[];
	nextPageToken: string | null;
}
