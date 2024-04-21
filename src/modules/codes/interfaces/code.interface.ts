import mongoose, { Document } from 'mongoose';

import { ICreatedAtEntity } from '../../../shared/interfaces/created-at.interface';
import { IUpdatedAtEntity } from '../../../shared/interfaces/updated-at.interface';
import CodesEnum from './codes.enum';

export interface ICode extends Document, ICreatedAtEntity, IUpdatedAtEntity {
	readonly _id: string;
	userId: mongoose.Schema.Types.ObjectId;
	value: string;
	type: CodesEnum.Type;
	expiresIn: Date;
}
