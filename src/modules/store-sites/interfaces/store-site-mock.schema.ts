import mongoose from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import StoreSitesEnum from './store-sites.enum';

/**
 * A copy of a site the owner keeps aside: an example to open again in the
 * editor and keep changing, without touching the site that is online.
 */
export interface IStoreSiteMock {
	_id: string;
	userId: string;
	storeId: string;
	name: string;
	templateId: StoreSitesEnum.Template;
	/** The site as the editor had it, checked as a site is when saved. */
	content: Record<string, unknown>;
	createdAt: Date;
	updatedAt: Date;
}

@Schema({ timestamps: true, collection: 'store-site-mocks' })
export class StoreSiteMock implements IStoreSiteMock {
	readonly _id: string;

	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId, index: true })
	userId: string;

	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId, index: true })
	storeId: string;

	@Prop({ required: true, type: String })
	name: string;

	@Prop({ required: true, type: String, enum: StoreSitesEnum.Template })
	templateId: StoreSitesEnum.Template;

	@Prop({ required: true, type: mongoose.Schema.Types.Mixed })
	content: Record<string, unknown>;

	createdAt: Date;

	updatedAt: Date;
}

export const StoreSiteMockSchema = SchemaFactory.createForClass(StoreSiteMock);
