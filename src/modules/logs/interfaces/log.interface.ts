import mongoose from 'mongoose';

import { ICreatedAtEntity } from '../../../shared/common/global/created-at.interface';
import LogsEnum from './logs.enum';

export interface ILog extends ICreatedAtEntity {
	readonly _id: mongoose.Schema.Types.ObjectId;
	message: string;
	data: any;
	type: LogsEnum.Type;
}
