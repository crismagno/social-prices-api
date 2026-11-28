import mongoose from 'mongoose';

import { IDynamicField } from '../../../shared/common/dynamic-field/dynamic-field.interface';
import { ICreatedAtEntity } from '../../../shared/common/global/created-at.interface';
import { IUpdatedAtEntity } from '../../../shared/common/global/updated-at.interface';
import { IPricing } from '../../../shared/common/pricing/pricing.interface';
import { IProductItem } from '../../product-items/interfaces/product-item.interface';

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
	sku: string | null;
	previousBarcodes: string[];
	QRCode: string | null;
	details: string | null;
	categoriesIds: mongoose.Schema.Types.ObjectId[];
	tagsIds: mongoose.Schema.Types.ObjectId[];
	uploadFilename: string | null;
	brand: string | null;
	location: string | null;
	historicPrices: IProductHistoricPrice[];
	releaseDate: Date | null;
	expirationDate: Date | null;
	dimensions: IProductDimensions | null;
	/** The years the product is for, when it is for some: a part, a model. */
	yearRange: IProductYearRange | null;
	pricing?: IPricing | null;
	colors: string[] | null;
	dynamicFields: IDynamicField[];
	productItemDefault?: IProductItem;
}

export interface IProductHistoricPrice {
	price: number;
	barcode: string;
	updatedAt: Date;
}

/**
 * The years a product is for, first and last. One of them left out leaves
 * that end open: only `from` is "since", only `to` is "until".
 */
export interface IProductYearRange {
	from: number | null;
	to: number | null;
}

export interface IProductDimensions {
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
