import mongoose from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import AppsEnum from '../interfaces/apps.enum';
import { IGoogleContactsConnection } from './google-contacts-connection.interface';
import { IGoogleContactsImportResult } from './google-contacts.types';

@Schema({ timestamps: true, collection: 'google_contacts_connections' })
export class GoogleContactsConnection
	implements Partial<IGoogleContactsConnection>
{
	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
	ownerUserId: mongoose.Schema.Types.ObjectId;

	@Prop({
		required: true,
		type: String,
		enum: Object.values(AppsEnum.ConnectionStatus),
	})
	status: AppsEnum.ConnectionStatus;

	@Prop({ type: String, default: null })
	googleEmail: string | null;

	@Prop({ type: String, select: false })
	tokens?: string;

	@Prop({ type: [String], default: [] })
	grantedScopes: string[];

	@Prop({ type: Date, default: null })
	accessTokenExpiresAt: Date | null;

	@Prop({ required: true, type: Date })
	connectedAt: Date;

	@Prop({ type: Date, default: null })
	lastImportAt: Date | null;

	@Prop({ type: Object, default: null })
	lastImport: IGoogleContactsImportResult | null;
}

export const GoogleContactsConnectionSchema = SchemaFactory.createForClass(
	GoogleContactsConnection,
);

GoogleContactsConnectionSchema.index({ ownerUserId: 1 }, { unique: true }); // one Google account per user
