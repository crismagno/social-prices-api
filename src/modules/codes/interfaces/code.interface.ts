import mongoose from 'mongoose';

import { ICreatedAtEntity } from '../../../shared/common/global/created-at.interface';
import { IUpdatedAtEntity } from '../../../shared/common/global/updated-at.interface';
import CodesEnum from './codes.enum';

export interface ICode extends ICreatedAtEntity, IUpdatedAtEntity {
	readonly _id: string;
	userId: mongoose.Schema.Types.ObjectId;
	employeeId: mongoose.Schema.Types.ObjectId | null;
	value: string;
	type: CodesEnum.Type;
	expiresIn: Date;
}
