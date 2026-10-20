import mongoose from 'mongoose';

import { ICreatedAtEntity } from '../../../shared/common/global/created-at.interface';
import { IUpdatedAtEntity } from '../../../shared/common/global/updated-at.interface';
import InstagramEnum from './instagram.enum';

/** One person talking to the user's account: who they are, the last message, and which customer they are. */
export interface IInstagramChat extends ICreatedAtEntity, IUpdatedAtEntity {
	readonly _id: string;
	ownerUserId: mongoose.Schema.Types.ObjectId;
	/** The Instagram account the conversation belongs to. */
	accountId: string;
	/** Account-scoped id: this person, for this account only. */
	igsid: string;
	name: string | null;
	username: string | null;
	profilePic: string | null;
	customerId: mongoose.Schema.Types.ObjectId | null;
	lastMessageAt: Date;
	lastMessageText: string | null;
	/** The kind of the file of the last message, when it had one and no text (or "unsupported"). */
	lastAttachmentType: string | null;
	lastMessageDirection: InstagramEnum.Direction;
	/** When the person last wrote: Instagram only allows answering for 24 hours after that. */
	lastIncomingAt: Date;
	unreadCount: number;
}
