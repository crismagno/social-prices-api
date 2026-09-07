import mongoose from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { ILog } from './log.interface';
import LogsEnum from './logs.enum';

@Schema()
export class Log implements ILog {
	readonly _id: mongoose.Schema.Types.ObjectId;

	@Prop({ required: true, type: Number })
	number: number;

	@Prop({ required: true, type: String })
	message: string;

	@Prop({ type: mongoose.Schema.Types.Mixed, default: null })
	data: any;

	@Prop({
		required: true,
		type: String,
		enum: {
			values: Object.keys(LogsEnum.Type),
			message: '{VALUE} is not supported',
		},
	})
	type: LogsEnum.Type;

	@Prop({ required: true, type: Date })
	createdAt: Date;
}

export const LogSchema = SchemaFactory.createForClass(Log);

LogSchema.index({ createdAt: -1 });
LogSchema.index({ type: 1 });
LogSchema.index({ number: 1 }, { unique: true, sparse: true });
