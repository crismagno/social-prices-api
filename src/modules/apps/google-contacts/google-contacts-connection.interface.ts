import mongoose from 'mongoose';

import { ICreatedAtEntity } from '../../../shared/common/global/created-at.interface';
import { IUpdatedAtEntity } from '../../../shared/common/global/updated-at.interface';
import AppsEnum from '../interfaces/apps.enum';
import { IGoogleContactsImportResult } from './google-contacts.types';

/** One user's link to one Google account, and the tokens that make it work. */
export interface IGoogleContactsConnection
	extends ICreatedAtEntity,
		IUpdatedAtEntity {
	readonly _id: string;
	ownerUserId: mongoose.Schema.Types.ObjectId;
	status: AppsEnum.ConnectionStatus;
	/** The Google account's e-mail; only to show who is connected. */
	googleEmail: string | null;
	/** Encrypted access + refresh tokens. Only present when selected explicitly. */
	tokens?: string;
	grantedScopes: string[];
	accessTokenExpiresAt: Date | null;
	connectedAt: Date;
	lastImportAt: Date | null;
	lastImport: IGoogleContactsImportResult | null;
}
