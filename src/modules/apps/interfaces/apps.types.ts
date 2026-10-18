import AppsEnum from './apps.enum';

export interface IAppContext {
	ownerUserId: string;
	employeeId: string | null;
}

/** One card of the apps catalog: the same few facts for every app. */
export interface IAppCatalogItem {
	id: AppsEnum.App;
	enabled: boolean;
	integrated: boolean;
	connected: boolean;
	status: AppsEnum.ConnectionStatus | null;
	accountLabel: string | null;
}
