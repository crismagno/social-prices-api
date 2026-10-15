import mongoose from 'mongoose';

import { ICreatedAtEntity } from '../../../shared/common/global/created-at.interface';
import { IUpdatedAtEntity } from '../../../shared/common/global/updated-at.interface';
import AppsEnum from './apps.enum';
import { IAppImportResult } from './apps.types';

export interface IAppConnection extends ICreatedAtEntity, IUpdatedAtEntity {
	readonly _id: string;
	ownerUserId: mongoose.Schema.Types.ObjectId;
	appId: AppsEnum.App;
	status: AppsEnum.ConnectionStatus;
	accountLabel: string | null;
	/** Encrypted blob. Only present when the query selected `+credentials`. */
	credentials?: string;
	scopes: string[];
	expiresAt: Date | null;
	connectedAt: Date;
	lastSyncAt: Date | null;
	lastSyncSummary: IAppImportResult | null;
}
