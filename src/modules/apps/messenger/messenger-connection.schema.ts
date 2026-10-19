import mongoose from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import AppsEnum from '../interfaces/apps.enum';
import {
	IMessengerConnection,
	IPendingMessengerPage,
} from './messenger-connection.interface';

@Schema({ timestamps: true, collection: 'messenger_connections' })
export class MessengerConnection implements Partial<IMessengerConnection> {
	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
	ownerUserId: mongoose.Schema.Types.ObjectId;

	@Prop({ type: String, enum: Object.values(AppsEnum.ConnectionStatus) })
	status?: AppsEnum.ConnectionStatus;

	@Prop({ type: String })
	pageId?: string;

	@Prop({ type: String })
	pageName?: string;

	@Prop({ type: String, select: false })
	token?: string;

	@Prop({ type: Date })
	connectedAt?: Date;

	@Prop({ type: Date, default: null })
	lastUpdateAt?: Date | null;

	@Prop({ type: [Object], select: false })
	pendingPages?: IPendingMessengerPage[];

	@Prop({ type: Date, default: null })
	pendingExpiresAt?: Date | null;
}

export const MessengerConnectionSchema =
	SchemaFactory.createForClass(MessengerConnection);

MessengerConnectionSchema.index({ ownerUserId: 1 }, { unique: true }); // one page per user
// A page can belong to one user only. Users still choosing have no page yet.
MessengerConnectionSchema.index(
	{ pageId: 1 },
	{ unique: true, partialFilterExpression: { pageId: { $type: 'string' } } },
);
