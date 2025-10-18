import mongoose from 'mongoose';

import { ICreatedAtEntity } from '../../../shared/common/global/created-at.interface';
import { IUpdatedAtEntity } from '../../../shared/common/global/updated-at.interface';

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
	barcode: string | null;
	previousBarcodes: string[];
	QRCode: string | null;
	details: string | null;
	categoriesIds: mongoose.Schema.Types.ObjectId[];
	tagsIds: mongoose.Schema.Types.ObjectId[];
	uploadFilename: string | null;
	brand: string | null;
	historicPrices: IProductHistoricPrice[];
}

export interface IProductHistoricPrice {
	price: number;
	barcode: string;
	updatedAt: Date;
}
