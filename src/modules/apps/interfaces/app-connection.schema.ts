import mongoose from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { IAppConnection } from './app-connection.interface';
import AppsEnum from './apps.enum';
import { IAppImportResult } from './apps.types';

@Schema({ timestamps: true, collection: 'app_connections' })
export class AppConnection implements Partial<IAppConnection> {
	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
	ownerUserId: mongoose.Schema.Types.ObjectId;

	@Prop({ required: true, type: String, enum: Object.values(AppsEnum.App) })
	appId: AppsEnum.App;

	@Prop({
		required: true,
		type: String,
		enum: Object.values(AppsEnum.ConnectionStatus),
	})
	status: AppsEnum.ConnectionStatus;

	@Prop({ type: String, default: null })
	accountLabel: string | null;

	@Prop({ type: String, select: false })
	credentials?: string;

	@Prop({ type: [String], default: [] })
	scopes: string[];

	@Prop({ type: Date, default: null })
	expiresAt: Date | null;

	@Prop({ required: true, type: Date })
	connectedAt: Date;

	@Prop({ type: Date, default: null })
	lastSyncAt: Date | null;

	@Prop({ type: Object, default: null })
	lastSyncSummary: IAppImportResult | null;
}

export const AppConnectionSchema = SchemaFactory.createForClass(AppConnection);

AppConnectionSchema.index({ ownerUserId: 1, appId: 1 }, { unique: true }); // one connection per user per app
