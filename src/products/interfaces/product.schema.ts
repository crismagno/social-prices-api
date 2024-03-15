import mongoose, { Document } from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { IProduct } from './product.interface';

@Schema()
export class Product extends Document implements IProduct {
	readonly _id: string;

	@Prop({ required: true, type: String })
	name: string;

	@Prop({ required: true, type: Number })
	quantity: number;

	@Prop()
	description: string | null;

	@Prop({ required: true, type: Number })
	price: number;

	@Prop({ required: true, type: Date })
	createdAt: Date;

	@Prop({ required: true, type: Date })
	updatedAt: Date;

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

	@Prop({ type: String })
	barCode: string | null;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
