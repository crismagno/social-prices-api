import mongoose from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { ITelegramChat } from './telegram-chat.interface';
import TelegramEnum from './telegram.enum';

@Schema({ timestamps: true, collection: 'telegram_chats' })
export class TelegramChat implements Partial<ITelegramChat> {
	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
	ownerUserId: mongoose.Schema.Types.ObjectId;

	@Prop({ required: true, type: Number })
	chatId: number;

	@Prop({ required: true, type: Number })
	telegramUserId: number;

	@Prop({ type: String, default: null })
	firstName: string | null;

	@Prop({ type: String, default: null })
	lastName: string | null;

	@Prop({ type: String, default: null })
	username: string | null;

	@Prop({ type: String, default: null })
	languageCode: string | null;

	@Prop({ type: mongoose.Schema.Types.ObjectId, default: null })
	customerId: mongoose.Schema.Types.ObjectId | null;

	@Prop({ required: true, type: Date })
	lastMessageAt: Date;

	@Prop({ type: String, default: null })
	lastMessageText: string | null;

	@Prop({
		required: true,
		type: String,
		enum: Object.values(TelegramEnum.Direction),
	})
	lastMessageDirection: TelegramEnum.Direction;

	@Prop({
		required: true,
		type: String,
		enum: Object.values(TelegramEnum.ContentType),
	})
	lastContentType: TelegramEnum.ContentType;

	@Prop({ type: Number, default: 0 })
	unreadCount: number;
}

export const TelegramChatSchema = SchemaFactory.createForClass(TelegramChat);

TelegramChatSchema.index({ ownerUserId: 1, chatId: 1 }, { unique: true }); // one conversation per person
TelegramChatSchema.index({ ownerUserId: 1, lastMessageAt: -1 }); // the inbox, most recent first
