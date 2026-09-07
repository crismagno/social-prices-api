import mongoose from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { ICode } from './code.interface';
import CodesEnum from './codes.enum';

@Schema()
export class Code implements ICode {
	readonly _id: string;

	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'User' })
	userId: mongoose.Schema.Types.ObjectId;

	@Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' })
	employeeId: mongoose.Schema.Types.ObjectId | null;

	@Prop({ required: true, type: String })
	value: string;

	@Prop({
		required: true,
		type: String,
		enum: {
			values: Object.keys(CodesEnum.Type),
			message: '{VALUE} is not supported',
		},
	})
	type: CodesEnum.Type;

	@Prop({ required: true, type: Date })
	expiresIn: Date;

	@Prop({ required: true, type: Date })
	createdAt: Date;

	@Prop({ required: true, type: Date })
	updatedAt: Date;
}

export const CodeSchema = SchemaFactory.createForClass(Code);
