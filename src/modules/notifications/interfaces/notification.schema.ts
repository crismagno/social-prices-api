import mongoose, { Document } from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { INotification } from './notification.interface';
import NotificationsEnum from './notifications.enum';

@Schema()
export class Notification extends Document implements INotification {
	readonly _id: string;

	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
	userId: mongoose.Schema.Types.ObjectId;

	@Prop({ type: mongoose.Schema.Types.Mixed })
	content: any;

	@Prop({ required: true, type: String })
	title: string;

	@Prop({ type: String })
	subtitle: string | null;

	@Prop({
		type: String,
		enum: {
			values: Object.keys(NotificationsEnum.Type),
			message: '{VALUE} is not supported',
		},
	})
	type: NotificationsEnum.Type;

	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
	createdByUserId: mongoose.Schema.Types.ObjectId;

	@Prop({ required: true, type: Boolean })
	isSeen: boolean;

	@Prop({ required: true, type: Date })
	createdAt: Date;

	@Prop({ required: true, type: Date })
	updatedAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
