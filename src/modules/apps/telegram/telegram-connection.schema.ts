import mongoose from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import AppsEnum from '../interfaces/apps.enum';
import { ITelegramConnection } from './telegram-connection.interface';

@Schema({ timestamps: true, collection: 'telegram_connections' })
export class TelegramConnection implements Partial<ITelegramConnection> {
	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
	ownerUserId: mongoose.Schema.Types.ObjectId;

	@Prop({
		required: true,
		type: String,
		enum: Object.values(AppsEnum.ConnectionStatus),
	})
	status: AppsEnum.ConnectionStatus;

	@Prop({ required: true, type: Number })
	botId: number;

	@Prop({ required: true, type: String })
	botUsername: string;

	@Prop({ required: true, type: String })
	botName: string;

	@Prop({ type: String, select: false })
	token?: string;

	@Prop({ required: true, type: String })
	webhookKey: string;

	@Prop({ type: String, select: false })
	webhookSecretHash?: string;

	@Prop({ required: true, type: Date })
	connectedAt: Date;

	@Prop({ type: Date })
	webhookRegisteredAt?: Date;

	@Prop({ type: Date, default: null })
	lastUpdateAt: Date | null;
}

export const TelegramConnectionSchema =
	SchemaFactory.createForClass(TelegramConnection);

TelegramConnectionSchema.index({ ownerUserId: 1 }, { unique: true }); // one bot per user
TelegramConnectionSchema.index({ botId: 1 }, { unique: true }); // a bot can only belong to one user
TelegramConnectionSchema.index({ webhookKey: 1 }, { unique: true }); // the webhook finds its connection by this
