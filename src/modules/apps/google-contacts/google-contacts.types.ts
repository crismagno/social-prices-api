import AppsEnum from '../interfaces/apps.enum';
import GoogleContactsEnum from './google-contacts.enum';

/** What the user gets back after saving contacts, and what is remembered of the last time. */
export interface IGoogleContactsImportResult {
	created: number;
	linked: number;
	skipped: number;
	failed: number;
	limitReached: boolean;
	finishedAt: Date;
}

/** What Google Contacts' own page needs to know about the connection. */
export interface IGoogleContactsConnectionView {
	connected: boolean;
	status: AppsEnum.ConnectionStatus | null;
	googleEmail: string | null;
	connectedAt: Date | null;
	lastImportAt: Date | null;
	lastImport: IGoogleContactsImportResult | null;
}

export interface IGoogleTokens {
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

export interface IGoogleContactRow {
	externalId: string;
	name: string;
	email: string | null;
	phone: string | null;
	status: GoogleContactsEnum.ContactStatus;
	/** The customer it is linked to, or that it matches by e-mail; null when none. */
	customerId: string | null;
}

/** What listing answers: the contacts, and whether more exist than were listed. */
export interface IGoogleContactsPreview {
	contacts: IGoogleContactRow[];
	hasMore: boolean;
}

/** What saving answers: the stored summary plus which contacts were saved. */
export interface IGoogleContactsImportResponse
	extends IGoogleContactsImportResult {
	savedExternalIds: string[];
	/** The customer each saved contact ended up on. */
	savedLinks: { externalId: string; customerId: string }[];
}
