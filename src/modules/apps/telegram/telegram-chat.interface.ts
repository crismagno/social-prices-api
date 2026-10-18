import mongoose from 'mongoose';

import { ICreatedAtEntity } from '../../../shared/common/global/created-at.interface';
import { IUpdatedAtEntity } from '../../../shared/common/global/updated-at.interface';
import TelegramEnum from './telegram.enum';

/** One person talking to the user's bot: who they are, the last message, and which customer they are. */
export interface ITelegramChat extends ICreatedAtEntity, IUpdatedAtEntity {
	readonly _id: string;
	ownerUserId: mongoose.Schema.Types.ObjectId;
	/** Telegram's chat id; in a private chat it is the same as the person's id. */
	chatId: number;
	telegramUserId: number;
	firstName: string | null;
	lastName: string | null;
	username: string | null;
	languageCode: string | null;
	customerId: mongoose.Schema.Types.ObjectId | null;
	lastMessageAt: Date;
	lastMessageText: string | null;
	lastMessageDirection: TelegramEnum.Direction;
	lastContentType: TelegramEnum.ContentType;
	unreadCount: number;
}
