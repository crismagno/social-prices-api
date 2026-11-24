import mongoose from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import {
	IStoreSite,
	IStoreSiteAbout,
	IStoreSiteBlock,
	IStoreSiteChat,
	IStoreSiteFooter,
	IStoreSitePage,
	IStoreSiteCatalog,
	IStoreSiteSignIn,
	IStoreSiteHero,
	IStoreSiteLogo,
	IStoreSiteMarquee,
	IStoreSiteSection,
	IStoreSiteTheme,
} from './store-site.interface';
import { TStoreSiteSizes } from '../store-site-sizes';
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
		backgroundImageUrls: { type: [String], default: [] },
		slideSeconds: {
			type: Number,
			default: StoreSitesEnum.DEFAULT_SLIDE_SECONDS,
		},
		featuredImageUrl: { type: String, default: null },
		featuredImageUrls: { type: [String], default: [] },
		featuredSlideSeconds: {
			type: Number,
			default: StoreSitesEnum.DEFAULT_SLIDE_SECONDS,
		},
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

const StoreSiteLogoSchema = new mongoose.Schema(
	{
		isActive: { type: Boolean, default: true },
		imageUrl: { type: String, default: null },
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

	@Prop({ type: String, default: null })
	displayName: string | null;

	@Prop({ type: mongoose.Schema.Types.Mixed, default: () => ({}) })
	sizes: Partial<TStoreSiteSizes>;

	@Prop({ type: mongoose.Schema.Types.Mixed, default: () => ({}) })
	footer: Partial<IStoreSiteFooter>;

	@Prop({ type: mongoose.Schema.Types.Mixed, default: () => ({}) })
	signIn: Partial<IStoreSiteSignIn>;

	@Prop({ type: mongoose.Schema.Types.Mixed, default: () => ({}) })
	catalog: Partial<IStoreSiteCatalog>;

	@Prop({ type: mongoose.Schema.Types.Mixed, default: () => ({}) })
	about: Partial<IStoreSiteAbout>;

	// No default: a site that never set its pages gets the ready ones, while an
	// empty list means the owner removed them all.
	@Prop({ type: mongoose.Schema.Types.Mixed })
	pages: IStoreSitePage[];

	@Prop({ type: mongoose.Schema.Types.Mixed, default: () => ({}) })
	chat: Partial<IStoreSiteChat>;

	// No default: a site saved before blocks existed simply has none.
	@Prop({ type: mongoose.Schema.Types.Mixed })
	blocks?: IStoreSiteBlock[];

	// False on every site saved before the page builder: they keep the
	// template's order until the owner arranges the pages.
	@Prop({ type: Boolean, default: false })
	isLayoutCustom: boolean;

	@Prop({ required: true, type: StoreSiteHeroSchema })
	hero: IStoreSiteHero;

	@Prop({ type: [StoreSiteSectionSchema], default: [] })
	sections: IStoreSiteSection[];

	@Prop({ required: true, type: StoreSiteMarqueeSchema })
	marquee: IStoreSiteMarquee;

	// Sites saved before the logo was editable show the logo of the store.
	@Prop({
		type: StoreSiteLogoSchema,
		default: () => ({ isActive: true, imageUrl: null }),
	})
	logo: IStoreSiteLogo;

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
