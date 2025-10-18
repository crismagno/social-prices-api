import mongoose from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { IProduct, IProductHistoricPrice } from './product.interface';

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

	@Prop({ type: [ProductHistoricPriceSchema], required: true, _id: false })
	historicPrices: IProductHistoricPrice[];

	@Prop({ required: true, type: Date })
	createdAt: Date;

	@Prop({ required: true, type: Date })
	updatedAt: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
