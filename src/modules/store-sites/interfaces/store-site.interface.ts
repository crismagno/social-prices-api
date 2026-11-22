import mongoose from 'mongoose';

import { ICreatedAtEntity } from '../../../shared/common/global/created-at.interface';
import { IUpdatedAtEntity } from '../../../shared/common/global/updated-at.interface';
import StoreSitesEnum from './store-sites.enum';

/** Hex colors (#rrggbb). Every template reads the same five. */
export interface IStoreSiteTheme {
	primary: string;
	secondary: string;
	accent: string;
	background: string;
	text: string;
}

export interface IStoreSiteHero {
	tagline: string | null;
	title: string;
	subtitle: string | null;
	backgroundImageUrl: string | null;
	featuredImageUrl: string | null;
	ctaLabel: string | null;
}

export interface IStoreSiteSection {
	key: string;
	title: string;
	description: string | null;
	imageUrl: string | null;
	isActive: boolean;
}

/**
 * The logo shown on the site. Without an image of its own it is the logo of
 * the store; switched off, the site shows none.
 */
export interface IStoreSiteLogo {
	isActive: boolean;
	imageUrl: string | null;
}

export interface IStoreSiteMarquee {
	isActive: boolean;
	items: string[];
}

/**
 * The storefront of one store. The content is the same whatever the template:
 * changing `templateId` changes only how it is drawn.
 */
export interface IStoreSite extends ICreatedAtEntity, IUpdatedAtEntity {
	readonly _id: mongoose.Schema.Types.ObjectId;
	userId: mongoose.Schema.Types.ObjectId;
	storeId: mongoose.Schema.Types.ObjectId;
	slug: string;
	templateId: StoreSitesEnum.Template;
	isPublished: boolean;
	publishedAt: Date | null;
	theme: IStoreSiteTheme;
	/** The name shown at the top of the site; empty means the store's name. */
	displayName?: string | null;
	hero: IStoreSiteHero;
	sections: IStoreSiteSection[];
	marquee: IStoreSiteMarquee;
	logo: IStoreSiteLogo;
	/** The order is the order the products are shown in. */
	productIds: mongoose.Schema.Types.ObjectId[];
}
