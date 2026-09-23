import mongoose from 'mongoose';

import { ICreatedAtEntity } from '../../../shared/common/global/created-at.interface';
import { ISoftDeleteEntity } from '../../../shared/common/soft-delete/soft-delete.interface';
import { IUpdatedAtEntity } from '../../../shared/common/global/updated-at.interface';
import ManagersEnum from './managers.enum';

export interface IManager
	extends ICreatedAtEntity,
		IUpdatedAtEntity,
		ISoftDeleteEntity {
	readonly _id: string;
	name: string;
	email: string;
	password: string;
	birthDate: Date | null;
	level: ManagersEnum.Level;
	isActive: boolean;
	isMain: boolean;
	createdByManagerId: mongoose.Schema.Types.ObjectId | null;
}
