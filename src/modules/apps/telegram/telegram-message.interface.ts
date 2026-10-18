import mongoose from 'mongoose';

import { ICreatedAtEntity } from '../../../shared/common/global/created-at.interface';
import TelegramEnum from './telegram.enum';

/** One message of a conversation: what a customer wrote, or what was answered here. */
export interface ITelegramMessageRecord extends ICreatedAtEntity {
	readonly _id: string;
	ownerUserId: mongoose.Schema.Types.ObjectId;
	direction: TelegramEnum.Direction;
	chatId: number;
	messageId: number;
	contentType: TelegramEnum.ContentType;
	text: string | null;
	sentAt: Date;
	/** IN only: Telegram's id of the update. Kept for tracing, not for de-duplication. */
	updateId?: number;
	/** IN only: who wrote. */
	fromUserId?: number;
	fromFirstName?: string | null;
	fromLastName?: string | null;
	fromUsername?: string | null;
	fromLanguageCode?: string | null;
	/** OUT only: the employee who answered, when it was not the owner. */
	sentByEmployeeId?: string | null;
}
