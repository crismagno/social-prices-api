import { IStoreSiteMap } from '../store-site-map';
import { IStoreSiteCanvas } from '../store-site-canvas';
import { IStoreSiteCatalogFilter } from '../store-site-catalog-filter';
import { IStoreSiteSectionBackground } from '../store-site-section-background';
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
	/** A logo or an image: the key of an uploaded picture. */
	imageUrl: string | null;
	/** A logo or an image: its height in pixels. */
	height: number | null;
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
	/** A logo above the name, in the same column. */
	isLogoVisible: boolean;
	/** The footer's own logo; empty, the logo of the site. */
	logoUrl: string | null;
	/** Its height in pixels, 20 to 160. */
	logoHeight: number;
	/** The columns of the footer, left to right: one to five. */
	sections: IStoreSiteFooterSection[];
	/** The section the name and the text are in. */
	textSection: string;
	/** The section the login button is in. */
	loginSection: string;
	/**
	 * Everything the footer shows, in order: links, and the name, the logo,
	 * paragraphs, pictures and the way into the app, each in its section.
	 */
	links: IStoreSiteFooterLink[];
	/**
	 * 2 once the name, the logo, the text and the sign-in are items of `links`;
	 * an older footer has them in its own fields, and is read into items.
	 */
	itemsVersion: number;
}

/** One thing the contact form asks. */
export interface IStoreSiteContactField {
	key: string;
	type: StoreSitesEnum.ContactFieldType;
	/** Its name over the field; empty, the usual one for its kind. */
	label: string | null;
	placeholder: string | null;
	isRequired: boolean;
	/** A choice among options only: what can be chosen. */
	options: string[];
}

/**
 * The form of the contact page: what it asks, its words, and where what a
 * visitor writes goes. The addresses it goes to are the owner's alone: the
 * public site never carries the e-mail or the webhook.
 */
export interface IStoreSiteContactForm {
	/** The heading over the form; empty, the site's own. */
	title: string | null;
	/** The words of the button; empty, the site's own. */
	buttonLabel: string | null;
	/** What is said once it was sent; empty, the site's own. */
	successMessage: string | null;
	fields: IStoreSiteContactField[];
	destination: StoreSitesEnum.ContactDestination;
	email: string | null;
	/** A number with its country code, digits only. */
	whatsapp: string | null;
	webhookUrl: string | null;
}

/**
 * What lies behind the whole site, from the entrance to the footer: the
 * site's colour as always, images that take turns, or a video.
 */
export interface IStoreSiteBackdrop {
	type: StoreSitesEnum.BackdropType;
	/** The images, in the order they are shown. */
	imageUrls: string[];
	/** Seconds each image stays, when there is more than one. */
	slideSeconds: number;
	/** An uploaded video: it plays in a loop, without sound. */
	videoUrl: string | null;
	/** The image shown on a phone and while the video loads. */
	posterUrl: string | null;
	/** How much of the site's colour lies over it, in percent: keeps words readable. */
	veil: number;
	blur: StoreSitesEnum.BackdropBlur;
	/** Whether it moves slowly, closer and farther. */
	isAnimated: boolean;
}

/** The typefaces of the site; an empty one is the template's own. */
export interface IStoreSiteFonts {
	/** Titles and whatever the template writes in its display face. */
	heading: StoreSitesEnum.Font | null;
	/** Everything else. */
	body: StoreSitesEnum.Font | null;
}

/** The line the cards with content of their own are laid out on. */
export interface IStoreSiteCardsStyle {
	layout: StoreSitesEnum.CardsLayout;
	/** How many places a line has before the next one. */
	columns: number;
	gap: StoreSitesEnum.CardsGap;
}

/** How one card is drawn, each its own way. */
export interface IStoreSiteCardLook {
	imagePosition: StoreSitesEnum.CardsImagePosition;
	textAlign: StoreSitesEnum.CardsAlign;
	look: StoreSitesEnum.CardsLook;
	/** How many places of the line it takes. */
	span: number;
}

/** How the strip of phrases looks and runs; empty is the template's own. */
export interface IStoreSiteMarqueeStyle {
	speed: StoreSitesEnum.MarqueeSpeed;
	direction: StoreSitesEnum.MarqueeDirection;
	/** Between the phrases; empty, the template's own symbol. */
	separator: string | null;
	size: StoreSitesEnum.MarqueeSize;
	background: string | null;
	color: string | null;
	pauseOnHover: boolean;
}

/** The cart button at the top of the site. */
export interface IStoreSiteCartButton {
	/** Off for a site that sells nothing: no cart and no "add" buttons. */
	isVisible: boolean;
	icon: StoreSitesEnum.CartButtonIcon;
	/** The words on it; empty, the template's own. */
	label: string | null;
	/** Off, only the icon shows. */
	isLabelVisible: boolean;
	size: StoreSitesEnum.CartButtonSize;
}

/** How the images of one place of the site look. */
export interface IStoreSiteImageLook {
	shape: StoreSitesEnum.ImageShape;
	ratio: StoreSitesEnum.ImageRatio;
}

/** How the images of the site look, by place. */
export interface IStoreSiteImageStyle {
	product: IStoreSiteImageLook;
	/** The photos of the sections the template draws. */
	section: IStoreSiteImageLook;
	/** The images of the blocks: image pieces, columns, team. */
	block: IStoreSiteImageLook;
}

/**
 * The header of the site: its name, its menu, the sign-in and the cart. It is
 * the site's own, the same on every page, apart from any entrance.
 */
/** The border of the header: its line, how thick, and its colour. */
export interface IStoreSiteHeaderBorder {
	style: StoreSitesEnum.BorderStyle;
	/** In pixels. */
	width: number;
	/** As #rrggbb; empty, the colour of the site's words. */
	color: string | null;
}

export interface IStoreSiteHeader {
	/** At the top only: it stays on screen while the visitor scrolls. */
	isFixed: boolean;
	/** The side of the screen it is at. */
	position: StoreSitesEnum.HeaderPosition;
	/** Its ready look; the colours, shadow and border chosen apply over it. */
	style: StoreSitesEnum.HeaderStyle;
	/** Its three parts in order: start, middle and end of the header. */
	order: StoreSitesEnum.HeaderPart[];
	/**
	 * How clean its background is, from 0 (solid) to 100 (none at all). With
	 * any, at the top it lies over the entrance instead of taking room.
	 */
	transparency: number;
	/**
	 * How strong its shadow is, from 0 (none) to 100. Empty, the usual one: a
	 * light shadow, and none on a clean header or down a side.
	 */
	shadow: number | null;
	/**
	 * The border on its edge that faces the page; empty, the usual thin line.
	 */
	border: IStoreSiteHeaderBorder | null;
	/** A border round the logo; empty, none. */
	logoBorder: IStoreSiteHeaderBorder | null;
	/** How strong the shadow under the logo is, 0 to 100; empty, none. */
	logoShadow: number | null;
	/** The colour of its words; empty, the site's. */
	color: string | null;
	/** The colour of its background, when it has one; empty, the site's. */
	background: string | null;
	/** How tall it is at the top or at the bottom, in pixels; empty, as its content. */
	height: number | null;
	/** How wide it is down a side, in pixels; empty, the usual width. */
	width: number | null;
	/** Buttons the owner added, beside the sign-in and the cart. */
	buttons: IStoreSiteBlockButton[];
	/**
	 * The order of its buttons, one by one: `SIGN_IN`, `CART` and each of the
	 * owner's own as `BUTTON_<its place in buttons>`.
	 */
	actionsOrder: string[];
	/** The size of the owner's own buttons and of the sign-in. */
	buttonSize: StoreSitesEnum.CartButtonSize;
	/**
	 * Where each part sits within its place; one left out sits as its place
	 * says (the start to the left, the middle centred, the end to the right).
	 */
	aligns: Partial<
		Record<StoreSitesEnum.HeaderPart, StoreSitesEnum.HeaderAlign>
	>;
	/** The link to the first page, at the start of the menu. */
	home: IStoreSiteHeaderHome;
}

/** The "home" of the menu: whether it is there and what it says. */
export interface IStoreSiteHeaderHome {
	isInMenu: boolean;
	/** Its words; empty, the site says "Home" in the visitor's language. */
	label: string | null;
	/** Its place among the pages of the menu: 0 is before them all. */
	position: number;
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

/**
 * What the bag asks before an order is sent, besides the name: each field
 * asked and needed, asked but free to skip, or not asked.
 */
/** How the cart window looks and what it shows of each product. */
export interface IStoreSiteCartLook {
	/** Its own title; null keeps the default one. */
	title: string | null;
	mode: StoreSitesEnum.CartMode;
	width: StoreSitesEnum.CartWidth;
	side: StoreSitesEnum.CartSide;
	isPhotoShown: boolean;
	isBrandShown: boolean;
	isDescriptionShown: boolean;
	/** Size and colors of the product. */
	isTagsShown: boolean;
	/** The years the product is for, when it is for some. */
	isYearsShown: boolean;
	/** A click on a product shows it in full. */
	isProductOpened: boolean;
	isShippingNoteShown: boolean;
	/** Its own words about shipping; null keeps the default ones. */
	shippingNote: string | null;
	/** Its own words on the button to go on; null keeps the default ones. */
	buttonLabel: string | null;
}

export interface IStoreSiteCheckout {
	fields: Record<StoreSitesEnum.CheckoutField, StoreSitesEnum.ChatFieldMode>;
	look: IStoreSiteCartLook;
}

export interface IStoreSiteFaqItem {
	question: string;
	answer: string;
}

/** What a page shows below its title: texts and an image or a video. */
export interface IStoreSitePageContent {
	/** A heading over the texts, in the look of the template; empty, none. */
	title: string | null;
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
	/** The icon beside its name in the menu; empty, none. */
	icon: StoreSitesEnum.FeatureIcon | null;
	/** The title at the top of the page; empty, the name in the menu. */
	title: string | null;
	/** A line under the title. */
	intro: string | null;
	content: IStoreSitePageContent;
	/** Questions and answers: only the support page has them. */
	faq: IStoreSiteFaqItem[];
	/** The page's own entrance; none, it follows the home's. */
	hero: IStoreSitePageHero | null;
	/** The page's own colours; one left out is the site's. */
	theme: Partial<IStoreSiteTheme> | null;
	/** What lies behind this page alone; none, what lies behind the site. */
	backdrop: IStoreSiteBackdrop | null;
	/** The form of the contact page: only that page has one. */
	contact: IStoreSiteContactForm | null;
}

/**
 * The entrance of one page, apart from the home's. Its title and the line
 * under it are the page's own `title` and `intro`.
 */
export interface IStoreSitePageHero {
	/** The line over the title; empty, none. */
	tagline: string | null;
	/** The words of the main button; empty, the home's. */
	ctaLabel: string | null;
	/** The picture behind; empty, the home's. */
	backgroundImageUrl: string | null;
	/** The picture beside the words; empty, none. */
	featuredImageUrl: string | null;
	/** How tall, in pixels; empty, the usual height of a page's top. */
	height: number | null;
	options: IStoreSiteHeroOptions;
	/** More pictures behind: with any, the entrance changes from one to the next. */
	backgroundImageUrls: string[];
	/** Seconds each picture behind stays, when there is more than one. */
	slideSeconds: number;
	/** More pictures beside the words: with any, they take turns. */
	featuredImageUrls: string[];
	/** Seconds each picture beside the words stays, when there is more than one. */
	featuredSlideSeconds: number;
	/** Its own sizes of the title, the line under it and the picture; an empty one is the site's. */
	sizes: Partial<Record<THeroSizeKey, number | null>>;
}

/** The sizes an entrance can have of its own. */
export type THeroSizeKey =
	| 'heroTitleWidth'
	| 'heroTitleSize'
	| 'heroSubtitleWidth'
	| 'heroSubtitleSize'
	| 'featuredImageWidth'
	| 'featuredImageHeight';

/**
 * The chat of the site: a button that opens a conversation with the store,
 * which answers it in its inbox. The visitor gives a name (always) and an
 * email and a phone as the owner asks.
 */
export interface IStoreSiteChat {
	isActive: boolean;
	position: StoreSitesEnum.ChatPosition;
	icon: StoreSitesEnum.ChatIcon;
	/** How big the button in the corner is. */
	buttonSize: StoreSitesEnum.ChatSize;
	/** How big the conversation window is. */
	windowSize: StoreSitesEnum.ChatSize;
	/** How the closed button calls for attention. */
	buttonAnimation: StoreSitesEnum.ChatButtonAnimation;
	/** How the window opens. */
	windowAnimation: StoreSitesEnum.ChatWindowAnimation;
	/** What the button says; empty, the site says its own. */
	buttonLabel: string | null;
	/** The title of the chat window; empty, the name of the site. */
	title: string | null;
	/** The first words the visitor reads. */
	greeting: string | null;
	/** How the email is asked, read from `extraFields`. */
	emailField: StoreSitesEnum.ChatFieldMode;
	/** How the phone is asked, read from `extraFields`. */
	phoneField: StoreSitesEnum.ChatFieldMode;
	/** Minutes a chat stays the visitor's after they last wrote; then they start again. */
	sessionMinutes: number;
	/** The fields the owner asks after the name, email and phone among them, in order. */
	extraFields: ISiteChatExtraField[];
	/** 2 once email and phone live in `extraFields`; older chats are read from their modes. */
	fieldsVersion: number;
	/** Its own colours; an empty one is the site's. */
	colors: IStoreSiteChatColors;
}

/** The colours of the chat alone; an empty one is the site's. */
export interface IStoreSiteChatColors {
	/** The button, the top of the window and the visitor's messages. */
	primary: string | null;
	/** The background of the window. */
	background: string | null;
	/** The words in the window. */
	text: string | null;
}

/** A field of the customer record the owner asks in the chat's form. */
export interface ISiteChatExtraField {
	field: StoreSitesEnum.ChatCustomerField;
	isRequired: boolean;
}

/** What a visitor answered to one of those fields. */
export interface ISiteChatAnswer {
	field: StoreSitesEnum.ChatCustomerField;
	/** The field's name, as the store reads it. */
	label: string;
	value: string;
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
	/** What the owner changed of how the entrance looks and what it says. */
	options?: Partial<IStoreSiteHeroOptions>;
}

/** Colours of the entrance alone; an empty one is the template's own. */
export interface IStoreSiteHeroColors {
	background: string | null;
	text: string | null;
	button: string | null;
}

/**
 * The owner's own choices for the entrance: which of its pieces show, one more
 * paragraph, where its button leads, a second button and its own colours.
 */
/** Pixels of room on each side of the entrance; empty, none added. */
export interface IStoreSiteHeroSpacing {
	top: number | null;
	right: number | null;
	bottom: number | null;
	left: number | null;
}

export interface IStoreSiteHeroOptions {
	isTaglineVisible: boolean;
	isTitleVisible: boolean;
	isSubtitleVisible: boolean;
	isFeaturedVisible: boolean;
	/**
	 * How much of the template's wash of colour lies over the photo, with its
	 * fading foot: 100 as the template draws it, 0 the photo as it is.
	 */
	veil: number;
	/** Room added around what the entrance holds, in pixels, side by side. */
	spacing: IStoreSiteHeroSpacing;
	isButtonVisible: boolean;
	/** A paragraph under the subtitle. */
	extraText: string | null;
	/** Where the main button leads; none, to the products. Its words are `ctaLabel`. */
	button: IStoreSiteBlockButton | null;
	/** One more button beside the main one; none without words. */
	secondButton: IStoreSiteBlockButton | null;
	colors: IStoreSiteHeroColors;
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
	/**
	 * An item of a menu of tabs only: the keys of the sections of its page it
	 * shows, one or several (a text, an image, a block...), in the page's order.
	 */
	sectionKeys: string[];
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
	/** A column of a box only. */
	button: IStoreSiteBlockButton | null;
	/** A card only: how this one is drawn. */
	card: IStoreSiteCardLook | null;
}

/** The button of a call-to-action block. */
export interface IStoreSiteBlockButton {
	label: string | null;
	target: StoreSitesEnum.BlockButtonTarget;
	/** A page target: null is the home. */
	pageKey: string | null;
	/** What the owner typed for the other targets: a number, an e-mail, an address. */
	value: string | null;
	variant: StoreSitesEnum.ButtonVariant;
	/** A ready icon before its words; with no words, the icon is the button. */
	icon: StoreSitesEnum.FeatureIcon | null;
	/** Its own colour, as #rrggbb; empty, the site's main one. */
	color: string | null;
}

/** The few options a piece of the page has; null where its type has none. */
export interface IStoreSiteBlockSettings {
	align: StoreSitesEnum.SectionAlign | null;
	width: StoreSitesEnum.SectionWidth | null;
	tone: StoreSitesEnum.SectionTone | null;
	/** A spacer's height in pixels. */
	height: number | null;
	divider: StoreSitesEnum.DividerStyle | null;
	/** A video piece: an uploaded video or a YouTube/Vimeo player. */
	media: IStoreSiteAboutMedia | null;
	/** A menu of tabs: in a row on top, or down the side. */
	menuStyle: StoreSitesEnum.MenuStyle | null;
	/** A menu of tabs: one section at a time, or all of them to scroll to. */
	menuMode: StoreSitesEnum.MenuMode | null;
	/** A menu down the side: on the left or on the right. */
	menuSide: StoreSitesEnum.MenuSide | null;
	/** A menu of tabs: how its items look. */
	menuLook: StoreSitesEnum.MenuLook | null;
	/** A menu of tabs: how a section comes in when its item is chosen. */
	menuEffect: StoreSitesEnum.MenuEffect | null;
	/** A menu of tabs: where it stays while the visitor scrolls its sections. */
	menuPlace: StoreSitesEnum.MenuPlace | null;
	/**
	 * A strip, cards or a text with media: true once it has content of its own.
	 * One placed before they had any still shows what the site had for all.
	 */
	isOwn: boolean | null;
	/** A strip with content of its own: how it looks and runs. */
	marquee: IStoreSiteMarqueeStyle | null;
	/** Cards with content of their own: how they are laid out. */
	cards: IStoreSiteCardsStyle | null;
	/** A text with media: the side its image or video is on. */
	mediaPosition: StoreSitesEnum.AboutMediaPosition | null;
	/** What lies behind the section; none on the entrance, which has its own. */
	background: IStoreSiteSectionBackground | null;
	/** A free canvas only: its height and what was placed on it. */
	canvas: IStoreSiteCanvas | null;
	/** A map only: its pins and how it is shown. */
	map: IStoreSiteMap | null;
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
	/** A row of buttons only. */
	buttons: IStoreSiteBlockButton[];
	settings: IStoreSiteBlockSettings;
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
/** What each product shows on the site, and whether they can be searched. */
export interface IStoreSiteCatalog {
	isNameShown: boolean;
	isPriceShown: boolean;
	/** The short description, under the name and the price. */
	isDescriptionShown: boolean;
	/** The years the product is for, when it is for some. */
	isYearsShown: boolean;
	/** A search box on the page of products. */
	isSearchShown: boolean;
	/** The "add" button of each product; off, products are only shown. */
	isAddButtonShown: boolean;
	/** A click on a product opens its details. */
	isDetailsOpened: boolean;
	/** A product opens in a window, or on a page of its own. */
	detailsMode: StoreSitesEnum.ProductDetailsMode;
	/** The heading of the products section. */
	isTitleShown: boolean;
	/** The owner's own heading; empty, the site says its own. */
	title: string | null;
	/** The owner's own text of the add button; empty, the site says its own. */
	addLabel: string | null;
	/** The floating filter of the page of products. */
	filter: IStoreSiteCatalogFilter;
}

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
	catalog?: Partial<IStoreSiteCatalog>;
	about?: Partial<IStoreSiteAbout>;
	pages?: IStoreSitePage[];
	chat?: Partial<IStoreSiteChat>;
	blocks?: IStoreSiteBlock[];
	header?: Partial<IStoreSiteHeader>;
	cartButton?: Partial<IStoreSiteCartButton>;
	imageStyle?: Partial<IStoreSiteImageStyle>;
	/** What the bag asks before an order is sent. */
	checkout?: Partial<IStoreSiteCheckout>;
	marqueeStyle?: Partial<IStoreSiteMarqueeStyle>;
	fonts?: Partial<IStoreSiteFonts>;
	backdrop?: Partial<IStoreSiteBackdrop>;
	/** The owner arranged the pages: only the blocks list says what shows where. */
	isLayoutCustom?: boolean;
	hero: IStoreSiteHero;
	sections: IStoreSiteSection[];
	marquee: IStoreSiteMarquee;
	logo: IStoreSiteLogo;
	/** The order is the order the products are shown in. */
	productIds: mongoose.Schema.Types.ObjectId[];
}
