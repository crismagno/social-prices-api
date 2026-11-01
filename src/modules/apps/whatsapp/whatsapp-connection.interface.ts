import mongoose from 'mongoose';

import { ICreatedAtEntity } from '../../../shared/common/global/created-at.interface';
import { IUpdatedAtEntity } from '../../../shared/common/global/updated-at.interface';
import AppsEnum from '../interfaces/apps.enum';

/**
 * One user's WhatsApp Business number and the token that speaks for it. The token
 * of a business that went through Embedded Signup does not expire on its own; it
 * stops working if the user removes the app from their business, and then the
 * connection is marked REVOKED.
 */
export interface IWhatsappConnection
	extends ICreatedAtEntity,
		IUpdatedAtEntity {
	readonly _id: string;
	ownerUserId: mongoose.Schema.Types.ObjectId;
	status: AppsEnum.ConnectionStatus;
	/** The business account the number belongs to. */
	wabaId: string;
	/** The number's id, the one that comes in webhooks and in the send calls. */
	phoneNumberId: string;
	displayPhoneNumber: string;
	verifiedName: string | null;
	/** Encrypted token. Only present when selected explicitly. */
	token?: string;
	/** Encrypted PIN of the number's registration. Only present when selected explicitly. */
	pin?: string;
	connectedAt: Date;
	lastUpdateAt: Date | null;
}
