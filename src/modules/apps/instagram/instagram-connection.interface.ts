import mongoose from 'mongoose';

import { ICreatedAtEntity } from '../../../shared/common/global/created-at.interface';
import { IUpdatedAtEntity } from '../../../shared/common/global/updated-at.interface';
import AppsEnum from '../interfaces/apps.enum';

/**
 * One user's Instagram professional account and the token that speaks for it. The
 * token only lasts 60 days; it is renewed while the account is in use, and once
 * it has expired the user connects again.
 */
export interface IInstagramConnection
	extends ICreatedAtEntity,
		IUpdatedAtEntity {
	readonly _id: string;
	ownerUserId: mongoose.Schema.Types.ObjectId;
	status: AppsEnum.ConnectionStatus;
	/** The account's id, the one that comes in webhooks. */
	instagramUserId: string;
	username: string;
	name: string | null;
	profilePictureUrl: string | null;
	/** Encrypted token. Only present when selected explicitly. */
	token?: string;
	tokenExpiresAt: Date;
	connectedAt: Date;
	lastUpdateAt: Date | null;
}
