import mongoose from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { IInstagramMessageRecord } from './instagram-message.interface';
import InstagramEnum from './instagram.enum';
import { IInstagramAttachment } from './instagram.types';

@Schema({
	timestamps: { createdAt: true, updatedAt: false },
	collection: 'instagram_messages',
})
export class InstagramMessage implements Partial<IInstagramMessageRecord> {
	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
	ownerUserId: mongoose.Schema.Types.ObjectId;

	@Prop({
		required: true,
		type: String,
		enum: Object.values(InstagramEnum.Direction),
	})
	direction: InstagramEnum.Direction;

	@Prop({ required: true, type: String })
	igsid: string;

	@Prop({ required: true, type: String })
	mid: string;

	@Prop({ type: String, default: null })
	text: string | null;

	@Prop({ type: [Object], default: [] })
	attachments: IInstagramAttachment[];

	@Prop({ type: Boolean, default: false })
	isUnsupported?: boolean;

	@Prop({ required: true, type: Date })
	sentAt: Date;

	@Prop({ type: String, default: null })
	sentByEmployeeId?: string | null;
}

export const InstagramMessageSchema =
	SchemaFactory.createForClass(InstagramMessage);

// A repeated delivery of the same message must not be stored twice.
InstagramMessageSchema.index({ ownerUserId: 1, mid: 1 }, { unique: true });
InstagramMessageSchema.index({ ownerUserId: 1, igsid: 1, _id: -1 }); // one conversation, newest first
