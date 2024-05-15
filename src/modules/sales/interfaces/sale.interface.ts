import mongoose from 'mongoose';

import { ICreatedAtEntity } from '../../../shared/interfaces/created-at.interface';
import { IUpdatedAtEntity } from '../../../shared/interfaces/updated-at.interface';
import SalesEnum from './sales.enum';

export interface ISale extends ICreatedAtEntity, IUpdatedAtEntity {
	readonly _id: string;
	description: string | null;
	userId: mongoose.Schema.Types.ObjectId;
	storeId: mongoose.Schema.Types.ObjectId;
	number: string;
	customerId: mongoose.Schema.Types.ObjectId;
	total: number;
	totalFinal: number;
	discount: number;
	type: SalesEnum.Type;
	payment: any;
}
