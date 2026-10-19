import mongoose from 'mongoose';

import { ICreatedAtEntity } from '../../../shared/common/global/created-at.interface';
import { IUpdatedAtEntity } from '../../../shared/common/global/updated-at.interface';
import MessengerEnum from './messenger.enum';

/** One person talking to the user's Page: who they are, the last message, and which customer they are. */
export interface IMessengerChat extends ICreatedAtEntity, IUpdatedAtEntity {
	readonly _id: string;
	ownerUserId: mongoose.Schema.Types.ObjectId;
	pageId: string;
	/** Page-scoped id: this person, for this Page only. */
	psid: string;
	name: string | null;
	profilePic: string | null;
	customerId: mongoose.Schema.Types.ObjectId | null;
	lastMessageAt: Date;
	lastMessageText: string | null;
	/** The kind of the file of the last message, when it had one and no text. */
	lastAttachmentType: string | null;
	lastMessageDirection: MessengerEnum.Direction;
	/** When the person last wrote: Facebook only allows answering for 24 hours after that. */
	lastIncomingAt: Date;
	unreadCount: number;
}
