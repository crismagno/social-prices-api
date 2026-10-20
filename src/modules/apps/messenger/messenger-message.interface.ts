import mongoose from 'mongoose';

import { ICreatedAtEntity } from '../../../shared/common/global/created-at.interface';
import MessengerEnum from './messenger.enum';
import {
	IMessengerAttachment,
	IMessengerLocalAttachment,
} from './messenger.types';

/** One message of a conversation: what a customer wrote, or what was answered here. */
export interface IMessengerMessageRecord extends ICreatedAtEntity {
	readonly _id: string;
	ownerUserId: mongoose.Schema.Types.ObjectId;
	direction: MessengerEnum.Direction;
	psid: string;
	/** Facebook's id of the message; what makes a repeated delivery harmless. */
	mid: string;
	text: string | null;
	attachments: IMessengerAttachment[];
	/** OUT only: the file this system sent, until its echo brings the address. */
	localAttachment?: IMessengerLocalAttachment;
	sentAt: Date;
	/** OUT only: the employee who answered, when it was not the owner. */
	sentByEmployeeId?: string | null;
}
