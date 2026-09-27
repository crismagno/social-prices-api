import mongoose from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { IFeedback } from './feedback.interface';
import FeedbacksEnum from './feedbacks.enum';

@Schema({ timestamps: true, collection: 'feedbacks' })
export class Feedback implements IFeedback {
	readonly _id: string;

	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
	userId: string;

	@Prop({ type: mongoose.Schema.Types.ObjectId, default: null })
	employeeId: string | null;

	@Prop({ required: true, type: String })
	email: string;

	@Prop({ type: String, default: null })
	name: string | null;

	@Prop({ required: true, type: String })
	message: string;

	@Prop({
		required: true,
		type: String,
		default: FeedbacksEnum.Status.NEW,
		enum: {
			values: Object.keys(FeedbacksEnum.Status),
			message: '{VALUE} is not supported',
		},
	})
	status: FeedbacksEnum.Status;

	@Prop({ type: Date, default: null })
	statusUpdatedAt: Date | null;

	@Prop({ type: mongoose.Schema.Types.ObjectId, default: null })
	statusUpdatedByManagerId: string | null;

	createdAt: Date;

	updatedAt: Date;
}

export const FeedbackSchema = SchemaFactory.createForClass(Feedback);
