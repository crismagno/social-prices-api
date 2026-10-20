import mongoose from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import AppsEnum from '../interfaces/apps.enum';
import { IInstagramConnection } from './instagram-connection.interface';

@Schema({ timestamps: true, collection: 'instagram_connections' })
export class InstagramConnection implements Partial<IInstagramConnection> {
	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
	ownerUserId: mongoose.Schema.Types.ObjectId;

	@Prop({
		required: true,
		type: String,
		enum: Object.values(AppsEnum.ConnectionStatus),
	})
	status: AppsEnum.ConnectionStatus;

	@Prop({ required: true, type: String })
	instagramUserId: string;

	@Prop({ required: true, type: String })
	username: string;

	@Prop({ type: String, default: null })
	name: string | null;

	@Prop({ type: String, default: null })
	profilePictureUrl: string | null;

	@Prop({ type: String, select: false })
	token?: string;

	@Prop({ required: true, type: Date })
	tokenExpiresAt: Date;

	@Prop({ required: true, type: Date })
	connectedAt: Date;

	@Prop({ type: Date, default: null })
	lastUpdateAt: Date | null;
}

export const InstagramConnectionSchema =
	SchemaFactory.createForClass(InstagramConnection);

InstagramConnectionSchema.index({ ownerUserId: 1 }, { unique: true }); // one account per user
InstagramConnectionSchema.index({ instagramUserId: 1 }, { unique: true }); // an account can belong to one user only
