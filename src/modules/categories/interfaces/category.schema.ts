import mongoose, { Document } from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import CategoriesEnum from './categories.enum';
import { ICategory } from './category.interface';

@Schema()
export class Category extends Document implements ICategory {
	readonly _id: string;

	@Prop({ required: true, type: String })
	name: string;

	@Prop({ required: true, type: String })
	code: string;

	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
	userId: mongoose.Schema.Types.ObjectId;

	@Prop({
		required: true,
		type: String,
		enum: {
			values: Object.keys(CategoriesEnum.Type),
			message: '{VALUE} is not supported',
		},
	})
	type: CategoriesEnum.Type;

	@Prop({ required: true, type: Date })
	createdAt: Date;

	@Prop({ required: true, type: Date })
	updatedAt: Date;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
