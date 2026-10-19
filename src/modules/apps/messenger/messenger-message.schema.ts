import mongoose from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { IMessengerMessageRecord } from './messenger-message.interface';
import MessengerEnum from './messenger.enum';
import { IMessengerAttachment } from './messenger.types';

@Schema({
	timestamps: { createdAt: true, updatedAt: false },
	collection: 'messenger_messages',
})
export class MessengerMessage implements Partial<IMessengerMessageRecord> {
	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
	ownerUserId: mongoose.Schema.Types.ObjectId;

	@Prop({
		required: true,
		type: String,
		enum: Object.values(MessengerEnum.Direction),
	})
	direction: MessengerEnum.Direction;

	@Prop({ required: true, type: String })
	psid: string;

	@Prop({ required: true, type: String })
	mid: string;

	@Prop({ type: String, default: null })
	text: string | null;

	@Prop({ type: [Object], default: [] })
	attachments: IMessengerAttachment[];

	@Prop({ required: true, type: Date })
	sentAt: Date;

	@Prop({ type: String, default: null })
	sentByEmployeeId?: string | null;
}

export const MessengerMessageSchema =
	SchemaFactory.createForClass(MessengerMessage);

// A repeated delivery of the same message must not be stored twice.
MessengerMessageSchema.index({ ownerUserId: 1, mid: 1 }, { unique: true });
MessengerMessageSchema.index({ ownerUserId: 1, psid: 1, _id: -1 }); // one conversation, newest first
