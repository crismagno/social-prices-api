namespace StoreSitesEnum {
	export enum Template {
		AURORA = 'AURORA',
		IMPACT = 'IMPACT',
		ATELIER = 'ATELIER',
		GARDEN = 'GARDEN',
		STUDIO = 'STUDIO',
	}

	export const TemplateLabels = {
		[Template.AURORA]: 'Aurora',
		[Template.IMPACT]: 'Impact',
		[Template.ATELIER]: 'Atelier',
		[Template.GARDEN]: 'Garden',
		[Template.STUDIO]: 'Studio',
	};

	/** What a link of the footer leads to: it decides its icon and how it opens. */
	export enum FooterLinkType {
		INSTAGRAM = 'INSTAGRAM',
		FACEBOOK = 'FACEBOOK',
		WHATSAPP = 'WHATSAPP',
		TIKTOK = 'TIKTOK',
		YOUTUBE = 'YOUTUBE',
		X = 'X',
		LINKEDIN = 'LINKEDIN',
		PINTEREST = 'PINTEREST',
		TELEGRAM = 'TELEGRAM',
		EMAIL = 'EMAIL',
		PHONE = 'PHONE',
		WEBSITE = 'WEBSITE',
		/** Words of the owner's own, shown as plain text with no icon. */
		TEXT = 'TEXT',
	}

	/** Background images of the entrance besides the first, shown in turn. */
	export const MAX_HERO_EXTRA_IMAGES = 5;
	export const MIN_SLIDE_SECONDS = 3;
	export const MAX_SLIDE_SECONDS = 20;
	export const DEFAULT_SLIDE_SECONDS = 6;

	export const MAX_FOOTER_LINKS = 12;
	export const MAX_FOOTER_SECTIONS = 5;

	/** Where the sign-in button of the site takes a customer, once signed in. */
	export enum SignInDestination {
		/** The conversation with the store, in the customer's account. */
		STORE_CHAT = 'STORE_CHAT',
		/** The customer's orders. */
		ORDERS = 'ORDERS',
		/** The home of the customer's account. */
		HOME = 'HOME',
	}

	/** What the about section shows beside its words. */
	export enum AboutMediaType {
		IMAGE = 'IMAGE',
		/** A video file the owner uploaded. */
		VIDEO = 'VIDEO',
		/** A YouTube or Vimeo video, shown in its player. */
		EMBED = 'EMBED',
	}

	export enum AboutMediaPosition {
		LEFT = 'LEFT',
		RIGHT = 'RIGHT',
		TOP = 'TOP',
	}

	export const MAX_ABOUT_TEXTS = 6;

	export const MAX_VIDEO_SIZE_BYTES = 20 * 1024 * 1024;

	/** The kinds of page a site has besides its home. */
	export enum SitePageType {
		PRODUCTS = 'PRODUCTS',
		ABOUT = 'ABOUT',
		SUPPORT = 'SUPPORT',
		/** A page the owner made: title, texts and an image or a video. */
		CUSTOM = 'CUSTOM',
	}

	/** The fixed addresses of the ready pages, under the address of the site. */
	export const READY_PAGE_SLUGS: Record<
		Exclude<SitePageType, SitePageType.CUSTOM>,
		string
	> = {
		[SitePageType.PRODUCTS]: 'produtos',
		[SitePageType.ABOUT]: 'sobre',
		[SitePageType.SUPPORT]: 'suporte',
	};

	export const MAX_CUSTOM_PAGES = 7;
	export const MAX_FAQ_ITEMS = 12;

	/** Lowercase letters, digits and hyphens, 3 to 40 characters. */
	export const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

	export const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

	export const MAX_SECTIONS = 6;
	export const MAX_MARQUEE_ITEMS = 8;
	export const MAX_PRODUCTS = 60;

	export const MAX_ORDER_ITEMS = 50;
	export const MAX_ORDER_ITEM_QUANTITY = 99;

	/** Orders one visitor may send a minute. */
	export const ORDERS_PER_MINUTE = 5;

	/** Orders one site may receive a minute, from everyone together. */
	export const ORDERS_PER_MINUTE_PER_SITE = 60;

	export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
}

export default StoreSitesEnum;
