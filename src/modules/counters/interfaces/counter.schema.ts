import { Document } from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { ICounter } from './counter.interface';
import CountersEnum from './counters.enum';

@Schema()
export class Counter extends Document implements ICounter {
	readonly _id: string;

	@Prop({ required: true, type: Number })
	count: number;

	@Prop({
		type: String,
		enum: {
			values: Object.keys(CountersEnum.Type),
			message: '{VALUE} is not supported',
		},
	})
	type: CountersEnum.Type;

	@Prop({ required: true, type: Date })
	createdAt: Date;

	@Prop({ required: true, type: Date })
	updatedAt: Date;
}

export const CounterSchema = SchemaFactory.createForClass(Counter);
