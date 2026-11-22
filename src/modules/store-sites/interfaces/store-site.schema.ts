import mongoose from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import {
	IStoreSite,
	IStoreSiteHero,
	IStoreSiteMarquee,
	IStoreSiteSection,
	IStoreSiteTheme,
} from './store-site.interface';
import StoreSitesEnum from './store-sites.enum';

const StoreSiteThemeSchema = new mongoose.Schema(
	{
		primary: { type: String, required: true },
		secondary: { type: String, required: true },
		accent: { type: String, required: true },
		background: { type: String, required: true },
		text: { type: String, required: true },
	},
	{ _id: false },
);

const StoreSiteHeroSchema = new mongoose.Schema(
	{
		tagline: { type: String, default: null },
		title: { type: String, required: true },
		subtitle: { type: String, default: null },
		backgroundImageUrl: { type: String, default: null },
		featuredImageUrl: { type: String, default: null },
		ctaLabel: { type: String, default: null },
	},
	{ _id: false },
);

const StoreSiteSectionSchema = new mongoose.Schema(
	{
		key: { type: String, required: true },
		title: { type: String, required: true },
		description: { type: String, default: null },
		imageUrl: { type: String, default: null },
		isActive: { type: Boolean, default: true },
	},
	{ _id: false },
);

const StoreSiteMarqueeSchema = new mongoose.Schema(
	{
		isActive: { type: Boolean, default: false },
		items: { type: [String], default: [] },
	},
	{ _id: false },
);

@Schema({ timestamps: true, collection: 'store-sites' })
export class StoreSite implements IStoreSite {
	readonly _id: mongoose.Schema.Types.ObjectId;

	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
	userId: mongoose.Schema.Types.ObjectId;

	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
	storeId: mongoose.Schema.Types.ObjectId;

	@Prop({ required: true, type: String })
	slug: string;

	@Prop({
		required: true,
		type: String,
		enum: Object.values(StoreSitesEnum.Template),
	})
	templateId: StoreSitesEnum.Template;

	@Prop({ type: Boolean, default: false })
	isPublished: boolean;

	@Prop({ type: Date, default: null })
	publishedAt: Date | null;

	@Prop({ required: true, type: StoreSiteThemeSchema })
	theme: IStoreSiteTheme;

	@Prop({ required: true, type: StoreSiteHeroSchema })
	hero: IStoreSiteHero;

	@Prop({ type: [StoreSiteSectionSchema], default: [] })
	sections: IStoreSiteSection[];

	@Prop({ required: true, type: StoreSiteMarqueeSchema })
	marquee: IStoreSiteMarquee;

	@Prop({ type: [mongoose.Schema.Types.ObjectId], default: [] })
	productIds: mongoose.Schema.Types.ObjectId[];

	createdAt: Date;

	updatedAt: Date;
}

export const StoreSiteSchema = SchemaFactory.createForClass(StoreSite);

// One site per store, one store per address.
StoreSiteSchema.index({ storeId: 1 }, { unique: true });
StoreSiteSchema.index({ slug: 1 }, { unique: true });
StoreSiteSchema.index({ userId: 1 });
