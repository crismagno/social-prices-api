import mongoose from 'mongoose';

import { ICreatedAtEntity } from '../../../shared/common/global/created-at.interface';
import { IUpdatedAtEntity } from '../../../shared/common/global/updated-at.interface';
import AppsEnum from '../interfaces/apps.enum';

/** A Page the user may still pick; its token is encrypted. */
export interface IPendingMessengerPage {
	pageId: string;
	pageName: string;
	token: string;
}

/**
 * One user's Facebook Page and the token that speaks for it. After the login a
 * user with several pages has no page yet, only `pendingPages` to choose from.
 */
export interface IMessengerConnection
	extends ICreatedAtEntity,
		IUpdatedAtEntity {
	readonly _id: string;
	ownerUserId: mongoose.Schema.Types.ObjectId;
	status?: AppsEnum.ConnectionStatus;
	pageId?: string;
	pageName?: string;
	/** Encrypted Page token. Only present when selected explicitly. */
	token?: string;
	connectedAt?: Date;
	lastUpdateAt?: Date | null;
	/** Only present when selected explicitly. */
	pendingPages?: IPendingMessengerPage[];
	pendingExpiresAt?: Date | null;
}
