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

	@Prop({ required: true, type: mongoose.Schema.Types.Mixed })
	title: string;

	@Prop({ type: mongoose.Schema.Types.Mixed })
	subtitle: string;

	@Prop({ type: String })
	type: NotificationsEnum.Type;

	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
	createdByUserId: mongoose.Schema.Types.ObjectId;

	@Prop({ required: true, type: Date })
	createdAt: Date;

	@Prop({ required: true, type: Date })
	updatedAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
