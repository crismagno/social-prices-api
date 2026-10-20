import mongoose from 'mongoose';

import { ICreatedAtEntity } from '../../../shared/common/global/created-at.interface';
import InstagramEnum from './instagram.enum';
import { IInstagramAttachment } from './instagram.types';

/** One message of a conversation: what a customer wrote, or what was answered. */
export interface IInstagramMessageRecord extends ICreatedAtEntity {
	readonly _id: string;
	ownerUserId: mongoose.Schema.Types.ObjectId;
	direction: InstagramEnum.Direction;
	igsid: string;
	/** Instagram's id of the message; what makes a repeated delivery harmless. */
	mid: string;
	text: string | null;
	attachments: IInstagramAttachment[];
	/** Instagram could not carry this kind of message (a like, a share...). */
	isUnsupported?: boolean;
	sentAt: Date;
	/** OUT only: the employee who answered from here, when it was not the owner. */
	sentByEmployeeId?: string | null;
}
