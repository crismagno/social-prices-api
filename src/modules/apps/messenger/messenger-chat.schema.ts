import mongoose from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { IMessengerChat } from './messenger-chat.interface';
import MessengerEnum from './messenger.enum';

@Schema({ timestamps: true, collection: 'messenger_chats' })
export class MessengerChat implements Partial<IMessengerChat> {
	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
	ownerUserId: mongoose.Schema.Types.ObjectId;

	@Prop({ required: true, type: String })
	pageId: string;

	@Prop({ required: true, type: String })
	psid: string;

	@Prop({ type: String, default: null })
	name: string | null;

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
		enum: Object.values(MessengerEnum.Direction),
	})
	lastMessageDirection: MessengerEnum.Direction;

	@Prop({ required: true, type: Date })
	lastIncomingAt: Date;

	@Prop({ type: Number, default: 0 })
	unreadCount: number;
}

export const MessengerChatSchema = SchemaFactory.createForClass(MessengerChat);

MessengerChatSchema.index({ ownerUserId: 1, psid: 1 }, { unique: true }); // one conversation per person
MessengerChatSchema.index({ ownerUserId: 1, lastMessageAt: -1 }); // the inbox, most recent first
