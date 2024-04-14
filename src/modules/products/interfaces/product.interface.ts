import mongoose from 'mongoose';

import { ICreatedAtEntity } from '../../../shared/interfaces/created-at.interface';
import { IUpdatedAtEntity } from '../../../shared/interfaces/updated-at.interface';

export interface IProduct extends ICreatedAtEntity, IUpdatedAtEntity {
	readonly _id: string;
	name: string;
	quantity: number;
	description: string | null;
	price: number;
	isActive: boolean;
	userId: mongoose.Schema.Types.ObjectId;
	storeIds: mongoose.Schema.Types.ObjectId[];
	filesUrl: string[];
	mainUrl: string | null;
	barCode: string | null;
	QRCode: string | null;
	details: string | null;
}
