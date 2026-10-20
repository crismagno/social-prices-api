import mongoose from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { IInstagramChat } from './instagram-chat.interface';
import InstagramEnum from './instagram.enum';

@Schema({ timestamps: true, collection: 'instagram_chats' })
export class InstagramChat implements Partial<IInstagramChat> {
	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
	ownerUserId: mongoose.Schema.Types.ObjectId;

	@Prop({ required: true, type: String })
	accountId: string;

	@Prop({ required: true, type: String })
	igsid: string;

	@Prop({ type: String, default: null })
	name: string | null;

	@Prop({ type: String, default: null })
	username: string | null;

	@Prop({ type: String, default: null })
	profilePic: string | null;

	@Prop({ type: mongoose.Schema.Types.ObjectId, default: null })
	customerId: mongoose.Schema.Types.ObjectId | null;

	@Prop({ required: true, type: Date })
	lastMessageAt: Date;

	@Prop({ type: String, default: null })
	lastMessageText: string | null;

	@Prop({ type: String, default: null })
	lastAttachmentType: string | null;

	@Prop({
		required: true,
		type: String,
		enum: Object.values(InstagramEnum.Direction),
	})
	lastMessageDirection: InstagramEnum.Direction;

	@Prop({ required: true, type: Date })
	lastIncomingAt: Date;

	@Prop({ type: Number, default: 0 })
	unreadCount: number;
}

export const InstagramChatSchema = SchemaFactory.createForClass(InstagramChat);

InstagramChatSchema.index({ ownerUserId: 1, igsid: 1 }, { unique: true }); // one conversation per person
InstagramChatSchema.index({ ownerUserId: 1, lastMessageAt: -1 }); // the inbox, most recent first
