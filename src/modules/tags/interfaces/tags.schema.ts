import mongoose, { Document } from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import TagsEnum from './tags.enum';
import { ITag } from './tags.interface';

@Schema()
export class Tag extends Document implements ITag {
	readonly _id: string;

	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
	userId: mongoose.Schema.Types.ObjectId | null;

	@Prop({ required: true, type: String })
	name: string;

	@Prop({ type: String })
	description: string | null;

	@Prop({ type: String })
	color: string | null;

	@Prop({
		type: String,
		enum: {
			values: Object.keys(TagsEnum.Type),
			message: '{VALUE} is not supported',
		},
	})
	type: TagsEnum.Type;

	@Prop({ required: true, type: Date })
	createdAt: Date;

	@Prop({ required: true, type: Date })
	updatedAt: Date;
}

export const TagSchema = SchemaFactory.createForClass(Tag);
