import mongoose from 'mongoose';

import { ICreatedAtEntity } from '../../../shared/interfaces/created-at.interface';
import { IUpdatedAtEntity } from '../../../shared/interfaces/updated-at.interface';
import NotificationsEnum from './notifications.enum';

export interface INotification extends ICreatedAtEntity, IUpdatedAtEntity {
	readonly _id: string;
	userId: mongoose.Schema.Types.ObjectId;
	content: any;
	title: string;
	subtitle: string | null;
	type: NotificationsEnum.Type;
	createdByUserId: mongoose.Schema.Types.ObjectId;
	isSeen: boolean;
}
