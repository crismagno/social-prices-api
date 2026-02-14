import mongoose from 'mongoose';

import {
	Prop,
	Schema,
	SchemaFactory,
} from '@nestjs/mongoose';

import {
	IProductItem,
	IProductItemDimensions,
	IProductItemHistoricPrice,
} from './product-item.interface';

@Schema()
export class ProductItemHistoricPrice implements IProductItemHistoricPrice {
	@Prop({ type: Number, required: true })
	price: number;

	@Prop({ type: String, required: true })
	barcode: string;

	@Prop({ type: Date, required: true })
	updatedAt: Date;
}

export const ProductItemHistoricPriceSchema = SchemaFactory.createForClass(
	ProductItemHistoricPrice,
);

@Schema()
export class ProductItemDimensions implements IProductItemDimensions {
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

export const ProductItemDimensionsSchema = SchemaFactory.createForClass(
	ProductItemDimensions,
);

@Schema({ toJSON: { virtuals: true } })
export class ProductItem implements IProductItem {
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

	@Prop({ type: [ProductItemHistoricPriceSchema], required: true, _id: false })
	historicPrices: IProductItemHistoricPrice[];

	@Prop({ type: ProductItemDimensionsSchema, _id: false })
	dimensions: IProductItemDimensions | null;

	@Prop({ type: [String] })
	colors: string[] | null;

	@Prop({
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		ref: 'Product',
	})
	productId: mongoose.Schema.Types.ObjectId;

	@Prop({ required: true, type: Date })
	createdAt: Date;

	@Prop({ required: true, type: Date })
	updatedAt: Date;
}

export const ProductItemSchema = SchemaFactory.createForClass(ProductItem);

// Virtual field for populated product
ProductItemSchema.virtual('product', {
	ref: 'Product',
	localField: 'productId',
	foreignField: '_id',
	justOne: true,
});
