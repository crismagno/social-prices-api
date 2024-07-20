import mongoose, { Document } from 'mongoose';

import { ICreatedAtEntity } from '../../../shared/interfaces/created-at.interface';
import { IUpdatedAtEntity } from '../../../shared/interfaces/updated-at.interface';
import TagsEnum from './tags.enum';

export interface ITag extends Document, ICreatedAtEntity, IUpdatedAtEntity {
	readonly _id: string;
	userId: mongoose.Schema.Types.ObjectId;
	name: string;
	description: string | null;
	color: string | null;
	type: TagsEnum.Type;
}
