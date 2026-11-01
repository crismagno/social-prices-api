import mongoose from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import AppsEnum from '../interfaces/apps.enum';
import { IWhatsappConnection } from './whatsapp-connection.interface';

@Schema({ timestamps: true, collection: 'whatsapp_connections' })
export class WhatsappConnection implements Partial<IWhatsappConnection> {
	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
	ownerUserId: mongoose.Schema.Types.ObjectId;

	@Prop({
		required: true,
		type: String,
		enum: Object.values(AppsEnum.ConnectionStatus),
	})
	status: AppsEnum.ConnectionStatus;

	@Prop({ required: true, type: String })
	wabaId: string;

	@Prop({ required: true, type: String })
	phoneNumberId: string;

	@Prop({ required: true, type: String })
	displayPhoneNumber: string;

	@Prop({ type: String, default: null })
	verifiedName: string | null;

	@Prop({ type: String, select: false })
	token?: string;

	@Prop({ type: String, select: false })
	pin?: string;

	@Prop({ required: true, type: Date })
	connectedAt: Date;

	@Prop({ type: Date, default: null })
	lastUpdateAt: Date | null;
}

export const WhatsappConnectionSchema =
	SchemaFactory.createForClass(WhatsappConnection);

WhatsappConnectionSchema.index({ ownerUserId: 1 }, { unique: true }); // one number per user
WhatsappConnectionSchema.index({ phoneNumberId: 1 }, { unique: true }); // a number can belong to one user only
