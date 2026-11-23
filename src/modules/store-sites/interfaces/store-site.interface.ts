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

export interface IStoreSiteAboutMedia {
	type: StoreSitesEnum.AboutMediaType;
	/** The key of an uploaded file, or the player address of a video link. */
	url: string;
}

/**
 * The "about" of the site: a title, as many paragraphs as the owner writes and
 * an image or a video. Empty, it falls back to the store's own description.
 */
export interface IStoreSiteAbout {
	isActive: boolean;
	title: string | null;
	texts: string[];
	media: IStoreSiteAboutMedia | null;
	mediaPosition: StoreSitesEnum.AboutMediaPosition;
}

export interface IStoreSiteFaqItem {
	question: string;
	answer: string;
}

/** What a page shows below its title: texts and an image or a video. */
export interface IStoreSitePageContent {
	texts: string[];
	media: IStoreSiteAboutMedia | null;
	mediaPosition: StoreSitesEnum.AboutMediaPosition;
}

/**
 * A page of the site besides its home, at /site/<site>/<slug>. Its place in
 * the list is its place in the menu.
 */
export interface IStoreSitePage {
	key: string;
	type: StoreSitesEnum.SitePageType;
	slug: string;
	/** The name in the menu; empty, the site names it by its kind. */
	label: string | null;
	isInMenu: boolean;
	/** The title at the top of the page; empty, the name in the menu. */
	title: string | null;
	/** A line under the title. */
	intro: string | null;
	content: IStoreSitePageContent;
	/** Questions and answers: only the support page has them. */
	faq: IStoreSiteFaqItem[];
}

/**
 * The chat of the site: a button that opens a conversation with the store,
 * which answers it in its inbox. The visitor gives a name (always) and an
 * email and a phone as the owner asks.
 */
export interface IStoreSiteChat {
	isActive: boolean;
	position: StoreSitesEnum.ChatPosition;
	icon: StoreSitesEnum.ChatIcon;
	/** What the button says; empty, the site says its own. */
	buttonLabel: string | null;
	/** The title of the chat window; empty, the name of the site. */
	title: string | null;
	/** The first words the visitor reads. */
	greeting: string | null;
	emailField: StoreSitesEnum.ChatFieldMode;
	phoneField: StoreSitesEnum.ChatFieldMode;
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
	/** More featured images: with any, they take turns. */
	featuredImageUrls?: string[];
	/** Seconds each featured image stays, when there is more than one. */
	featuredSlideSeconds?: number;
	ctaLabel: string | null;
}

export interface IStoreSiteSection {
	key: string;
	title: string;
	description: string | null;
	imageUrl: string | null;
	isActive: boolean;
}

/** One entry of a block; which fields count depends on the block's type. */
export interface IStoreSiteBlockItem {
	key: string;
	/** A name, a question, a number or a step. */
	title: string | null;
	/** A role, a place or a label. */
	subtitle: string | null;
	/** A quote, an answer or a description. */
	text: string | null;
	/** A photo or a logo: the key of an uploaded image. */
	imageUrl: string | null;
	/** Feature cards only. */
	icon: StoreSitesEnum.FeatureIcon | null;
	/** Testimonials only: 1 to 5 stars. */
	rating: number | null;
}

/** The button of a call-to-action block. */
export interface IStoreSiteBlockButton {
	label: string | null;
	target: StoreSitesEnum.BlockButtonTarget;
	/** A page target: null is the home. */
	pageKey: string | null;
	/** What the owner typed for the other targets: a number, an e-mail, an address. */
	value: string | null;
}

/**
 * A block of content the owner added: team, testimonials, logos, features,
 * questions, numbers, steps or a call to action, on the home or on a page.
 */
export interface IStoreSiteBlock {
	key: string;
	type: StoreSitesEnum.BlockType;
	isActive: boolean;
	/** The page it shows on; null is the home. */
	pageKey: string | null;
	kicker: string | null;
	title: string | null;
	subtitle: string | null;
	items: IStoreSiteBlockItem[];
	/** Calls to action only. */
	button: IStoreSiteBlockButton | null;
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
	about?: Partial<IStoreSiteAbout>;
	pages?: IStoreSitePage[];
	chat?: Partial<IStoreSiteChat>;
	blocks?: IStoreSiteBlock[];
	hero: IStoreSiteHero;
	sections: IStoreSiteSection[];
	marquee: IStoreSiteMarquee;
	logo: IStoreSiteLogo;
	/** The order is the order the products are shown in. */
	productIds: mongoose.Schema.Types.ObjectId[];
}
