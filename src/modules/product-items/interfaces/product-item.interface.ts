import mongoose from 'mongoose';

import {
	ICreatedAtEntity,
} from '../../../shared/common/global/created-at.interface';
import {
	IUpdatedAtEntity,
} from '../../../shared/common/global/updated-at.interface';
import { IProduct } from '../../products/interfaces/product.interface';

export interface IProductItem extends ICreatedAtEntity, IUpdatedAtEntity {
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
	sku: string | null;
	previousBarcodes: string[];
	QRCode: string | null;
	details: string | null;
	categoriesIds: mongoose.Schema.Types.ObjectId[];
	tagsIds: mongoose.Schema.Types.ObjectId[];
	uploadFilename: string | null;
	brand: string | null;
	historicPrices: IProductItemHistoricPrice[];
	releaseDate: Date | null;
	expirationDate: Date | null;
	dimensions: IProductItemDimensions | null;
	colors: string[] | null;
	productId: mongoose.Schema.Types.ObjectId;
	product?: IProduct;
}

export interface IProductItemHistoricPrice {
	price: number;
	barcode: string;
	updatedAt: Date;
}

export interface IProductItemDimensions {
	size: string | null;
	height: number | null;
	width: number | null;
	length: number | null;
	depth: number | null;
	diameter: number | null;
	thickness: number | null;
	volume: number | null;
	weight: number | null;
}
