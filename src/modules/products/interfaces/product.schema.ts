import mongoose from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { IDynamicField } from '../../../shared/common/dynamic-field/dynamic-field.interface';
import { DynamicFieldSchema } from '../../../shared/common/dynamic-field/dynamic-field.schema';

import {
	IProduct,
	IProductDimensions,
	IProductHistoricPrice,
} from './product.interface';

@Schema()
export class ProductHistoricPrice implements IProductHistoricPrice {
	@Prop({ type: Number, required: true })
	price: number;

	@Prop({ type: String, required: true })
	barcode: string;

	@Prop({ type: Date, required: true })
	updatedAt: Date;
}

export const ProductHistoricPriceSchema =
	SchemaFactory.createForClass(ProductHistoricPrice);

@Schema()
export class ProductDimensions implements IProductDimensions {
	@Prop({ type: String })
	size: string | null;

	@Prop({ type: Number })
	height: number | null;

	@Prop({ type: Number })
	width: number | null;

	@Prop({ type: Number })
	length: number | null;

	@Prop({ type: Number })
	depth: number | null;

	@Prop({ type: Number })
	diameter: number | null;

	@Prop({ type: Number })
	thickness: number | null;

	@Prop({ type: Number })
	volume: number | null;

	@Prop({ type: Number })
	weight: number | null;
}

export const ProductDimensionsSchema =
	SchemaFactory.createForClass(ProductDimensions);

@Schema()
export class Product implements IProduct {
	readonly _id: string;

	@Prop({ required: true, type: String })
	name: string;

	@Prop({ required: true, type: Number })
	quantity: number;

	@Prop({ type: String })
	description: string | null;

	@Prop({ required: true, type: Number })
	price: number;

	@Prop({ required: true, type: Boolean })
	isActive: boolean;

	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
	userId: mongoose.Schema.Types.ObjectId;

	@Prop({ type: [mongoose.Schema.Types.ObjectId] })
	storeIds: mongoose.Schema.Types.ObjectId[];

	@Prop({ type: [String] })
	filesUrl: string[];

	@Prop({ type: String })
	mainUrl: string | null;

	@Prop({ type: String, sparse: true })
	barcode: string | null;

	@Prop({ type: String })
	sku: string | null;

	@Prop({ type: [String] })
	previousBarcodes: string[];

	@Prop({ type: String })
	QRCode: string | null;

	@Prop({ type: String })
	details: string | null;

	@Prop({ type: [mongoose.Schema.Types.ObjectId] })
	categoriesIds: mongoose.Schema.Types.ObjectId[];

	@Prop({ type: [mongoose.Schema.Types.ObjectId] })
	tagsIds: mongoose.Schema.Types.ObjectId[];

	@Prop({ type: String })
	uploadFilename: string | null;

	@Prop({ type: String })
	brand: string | null;

	@Prop({ type: Date })
	releaseDate: Date | null;

	@Prop({ type: Date })
	expirationDate: Date | null;

	@Prop({ type: [ProductHistoricPriceSchema], required: true, _id: false })
	historicPrices: IProductHistoricPrice[];

	@Prop({ type: ProductDimensionsSchema, _id: false })
	dimensions: IProductDimensions | null;

	@Prop({ type: [String] })
	colors: string[] | null;

	@Prop({ type: [DynamicFieldSchema], default: [] })
	dynamicFields: IDynamicField[];

	@Prop({ required: true, type: Date })
	createdAt: Date;

	@Prop({ required: true, type: Date })
	updatedAt: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
