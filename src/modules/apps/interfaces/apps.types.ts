import AppsEnum from './apps.enum';

export interface IAppContext {
	ownerUserId: string;
	employeeId: string | null;
}

export interface IAppContactRow {
	externalId: string;
	name: string;
	email: string | null;
	phone: string | null;
	status: AppsEnum.ContactStatus;
}

export interface IAppSyncPreview {
	contacts: IAppContactRow[];
	hasMore: boolean;
}

export interface IAppImportResult {
	created: number;
	linked: number;
	skipped: number;
	failed: number;
	limitReached: boolean;
	finishedAt: Date;
}

export interface IAppCatalogItem {
	id: AppsEnum.App;
	enabled: boolean;
	integrated: boolean;
	connected: boolean;
	status: AppsEnum.ConnectionStatus | null;
	accountLabel: string | null;
	lastSyncAt: Date | null;
	lastSyncSummary: IAppImportResult | null;
}

/** What the save endpoint answers: the stored summary plus which contacts were saved. */
export interface IAppImportResponse extends IAppImportResult {
	savedExternalIds: string[];
}

/**
 * The extension point. One class per app; `sync` is optional so an app that
 * only signs in (or does nothing yet) is not forced to stub it.
 */
export interface IAppIntegration {
	readonly appId: AppsEnum.App;
	getConnectUrl(ctx: IAppContext): Promise<string>;
	handleCallback(
		params: Record<string, string>,
	): Promise<{ redirectTo: string }>;
	disconnect(ctx: IAppContext): Promise<void>;
	/** Lists what the provider has and what is already here; saves nothing. */
	sync?(ctx: IAppContext): Promise<IAppSyncPreview>;
	/** Creates only the chosen items that do not exist yet. */
	importSelected?(
		ctx: IAppContext,
		externalIds: string[],
	): Promise<IAppImportResponse>;
}
