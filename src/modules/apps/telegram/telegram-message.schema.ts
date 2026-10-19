import mongoose from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { ITelegramMessageRecord } from './telegram-message.interface';
import TelegramEnum from './telegram.enum';
import { ITelegramMedia } from './telegram.types';

@Schema({
	timestamps: { createdAt: true, updatedAt: false },
	collection: 'telegram_messages',
})
export class TelegramMessage implements Partial<ITelegramMessageRecord> {
	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
	ownerUserId: mongoose.Schema.Types.ObjectId;

	@Prop({
		required: true,
		type: String,
		enum: Object.values(TelegramEnum.Direction),
	})
	direction: TelegramEnum.Direction;

	@Prop({ required: true, type: Number })
	chatId: number;

	@Prop({ required: true, type: Number })
	messageId: number;

	@Prop({
		required: true,
		type: String,
		enum: Object.values(TelegramEnum.ContentType),
	})
	contentType: TelegramEnum.ContentType;

	@Prop({ type: String, default: null })
	text: string | null;

	@Prop({ type: Object })
	media?: ITelegramMedia;

	@Prop({ required: true, type: Date })
	sentAt: Date;

	@Prop({ type: Number })
	updateId?: number;

	@Prop({ type: Number })
	fromUserId?: number;

	@Prop({ type: String, default: null })
	fromFirstName?: string | null;

	@Prop({ type: String, default: null })
	fromLastName?: string | null;

	@Prop({ type: String, default: null })
	fromUsername?: string | null;

	@Prop({ type: String, default: null })
	fromLanguageCode?: string | null;

	@Prop({ type: String, default: null })
	sentByEmployeeId?: string | null;
}

export const TelegramMessageSchema =
	SchemaFactory.createForClass(TelegramMessage);

// Telegram numbers messages per chat, so this is what makes a repeated delivery harmless.
TelegramMessageSchema.index(
	{ ownerUserId: 1, chatId: 1, messageId: 1, direction: 1 },
	{ unique: true },
);
TelegramMessageSchema.index({ ownerUserId: 1, chatId: 1, _id: -1 }); // one conversation, newest first
