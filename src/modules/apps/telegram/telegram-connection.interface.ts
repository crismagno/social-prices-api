import mongoose from 'mongoose';

import { ICreatedAtEntity } from '../../../shared/common/global/created-at.interface';
import { IUpdatedAtEntity } from '../../../shared/common/global/updated-at.interface';
import AppsEnum from '../interfaces/apps.enum';

/** One user's Telegram bot, and what is needed to talk to it and hear from it. */
export interface ITelegramConnection
	extends ICreatedAtEntity,
		IUpdatedAtEntity {
	readonly _id: string;
	ownerUserId: mongoose.Schema.Types.ObjectId;
	status: AppsEnum.ConnectionStatus;
	/** Telegram's own id of the bot; one bot can belong to one user only. */
	botId: number;
	botUsername: string;
	botName: string;
	/** Encrypted bot token. Only present when selected explicitly. */
	token?: string;
	/** Part of the webhook URL. */
	webhookKey: string;
	/** Hash of the secret Telegram sends back. Only present when selected. */
	webhookSecretHash?: string;
	connectedAt: Date;
	/** When the webhook was last pointed at this system (connecting or registering again). */
	webhookRegisteredAt?: Date;
	lastUpdateAt: Date | null;
}
