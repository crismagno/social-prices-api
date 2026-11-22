import mongoose from 'mongoose';

import { ICreatedAtEntity } from '../../../shared/common/global/created-at.interface';
import { IUpdatedAtEntity } from '../../../shared/common/global/updated-at.interface';
import { TStoreSiteSizes } from '../store-site-sizes';
import StoreSitesEnum from './store-sites.enum';

/** Hex colors (#rrggbb). Every template reads the same five. */
export interface IStoreSiteTheme {
	primary: string;
	secondary: string;
	accent: string;
	background: string;
	text: string;
}

export interface IStoreSiteFooterLink {
	key: string;
	type: StoreSitesEnum.FooterLinkType;
	/** What the link says; empty, the site names it by its kind. */
	label: string;
	url: string;
	/** The key of the section of the footer it is shown in. */
	section: string;
}

/** One column of the footer, with an optional title above what is in it. */
export interface IStoreSiteFooterSection {
	key: string;
	title: string | null;
}

/**
 * The foot of the site: a few words, as many links as the owner wants (social
 * networks, other sites, ways to get in touch) and the way into the app.
 */
export interface IStoreSiteFooter {
	isActive: boolean;
	text: string | null;
	/** The button that takes a customer to the login of the app. */
	isLoginVisible: boolean;
	/** The columns of the footer, left to right: one to five. */
	sections: IStoreSiteFooterSection[];
	/** The section the name and the text are in. */
	textSection: string;
	/** The section the login button is in. */
	loginSection: string;
	links: IStoreSiteFooterLink[];
}

/** The sign-in button at the top of the site. */
export interface IStoreSiteSignIn {
	isVisible: boolean;
	/** What the button says; empty, the site says "Sign in". */
	label: string | null;
	destination: StoreSitesEnum.SignInDestination;
}

export interface IStoreSiteHero {
	tagline: string | null;
	title: string;
	subtitle: string | null;
	backgroundImageUrl: string | null;
	/** More backgrounds: with any, the entrance changes from one to the next. */
	backgroundImageUrls?: string[];
	/** Seconds each background stays, when there is more than one. */
	slideSeconds?: number;
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
	/** Sizes the owner set, in pixels; an empty one is the template's own. */
	sizes?: Partial<TStoreSiteSizes>;
	footer?: Partial<IStoreSiteFooter>;
	signIn?: Partial<IStoreSiteSignIn>;
	hero: IStoreSiteHero;
	sections: IStoreSiteSection[];
	marquee: IStoreSiteMarquee;
	logo: IStoreSiteLogo;
	/** The order is the order the products are shown in. */
	productIds: mongoose.Schema.Types.ObjectId[];
}
