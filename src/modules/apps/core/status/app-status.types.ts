import AppsEnum from '../../interfaces/apps.enum';

/** What the catalog shows about any app: only whether it is connected, and to whom. */
export interface IAppConnectionStatus {
	connected: boolean;
	status: AppsEnum.ConnectionStatus | null;
	accountLabel: string | null;
}

/**
 * Each app answers this about itself, from wherever it keeps its connection.
 * The catalog never reads an app's data directly.
 */
export interface IAppStatusProvider {
	readonly appId: AppsEnum.App;
	getStatus(ownerUserId: string): Promise<IAppConnectionStatus>;
}

export const APP_STATUS_PROVIDERS: symbol = Symbol('APP_STATUS_PROVIDERS');
