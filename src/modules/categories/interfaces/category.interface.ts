import mongoose from 'mongoose';

import { ICreatedAtEntity } from '../../../shared/interfaces/created-at.interface';
import { IUpdatedAtEntity } from '../../../shared/interfaces/updated-at.interface';
import CategoriesEnum from './categories.enum';

export interface ICategory extends ICreatedAtEntity, IUpdatedAtEntity {
	readonly _id: string;
	name: string;
	code: string;
	type: CategoriesEnum.Type;
	userId: mongoose.Schema.Types.ObjectId;
}
