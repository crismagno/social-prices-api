namespace StoreSitesEnum {
	export enum Template {
		AURORA = 'AURORA',
		IMPACT = 'IMPACT',
		ATELIER = 'ATELIER',
		GARDEN = 'GARDEN',
		STUDIO = 'STUDIO',
		RIVIERA = 'RIVIERA',
		MARE = 'MARE',
		SWELL = 'SWELL',
		BUDDY = 'BUDDY',
		ARCADE = 'ARCADE',
		ATLAS = 'ATLAS',
		NEBULA = 'NEBULA',
		LUMEN = 'LUMEN',
	}

	export const TemplateLabels = {
		[Template.AURORA]: 'Aurora',
		[Template.IMPACT]: 'Impact',
		[Template.ATELIER]: 'Atelier',
		[Template.GARDEN]: 'Garden',
		[Template.STUDIO]: 'Studio',
		[Template.RIVIERA]: 'Riviera',
		[Template.MARE]: 'Maré',
		[Template.SWELL]: 'Swell',
		[Template.BUDDY]: 'Buddy',
		[Template.ARCADE]: 'Arcade',
		[Template.ATLAS]: 'Atlas',
		[Template.NEBULA]: 'Nebula',
		[Template.LUMEN]: 'Lumen',
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
		// What is not a link: the footer shows it as it is.
		/** The name of the site, or words of the owner's in its place. */
		NAME = 'NAME',
		/** The logo of the site, or a picture of the owner's in its place. */
		LOGO = 'LOGO',
		/** A paragraph. */
		NOTE = 'NOTE',
		/** A picture, which can lead somewhere. */
		IMAGE = 'IMAGE',
		/** The button into the app. */
		SIGN_IN = 'SIGN_IN',
	}

	/** The kinds of item of the footer that are not links. */
	export const FOOTER_CONTENT_TYPES: FooterLinkType[] = [
		FooterLinkType.NAME,
		FooterLinkType.LOGO,
		FooterLinkType.NOTE,
		FooterLinkType.IMAGE,
		FooterLinkType.SIGN_IN,
	];

	/** Background images of the entrance besides the first, shown in turn. */
	export const MAX_HERO_EXTRA_IMAGES = 5;
	export const MIN_SLIDE_SECONDS = 3;
	export const MAX_SLIDE_SECONDS = 20;
	export const DEFAULT_SLIDE_SECONDS = 6;

	export const MAX_FOOTER_LINKS = 30;
	export const MAX_FOOTER_SECTIONS = 5;

	/** Where the sign-in button of the site takes a customer, once signed in. */
	/** The side of the screen the header of the site is at. */
	export enum HeaderPosition {
		TOP = 'TOP',
		BOTTOM = 'BOTTOM',
		LEFT = 'LEFT',
		RIGHT = 'RIGHT',
	}

	/** What the header holds: the name with the logo, the menu, the buttons. */
	export enum HeaderPart {
		BRAND = 'BRAND',
		MENU = 'MENU',
		ACTIONS = 'ACTIONS',
	}

	/** Where a part of the header sits within its place. */
	export enum HeaderAlign {
		LEFT = 'LEFT',
		CENTER = 'CENTER',
		RIGHT = 'RIGHT',
	}

	/** The buttons of the header: the owner's own, the sign-in and the cart. */
	export enum HeaderAction {
		/** Every button of the owner together: how the order was first kept. */
		BUTTONS = 'BUTTONS',
		SIGN_IN = 'SIGN_IN',
		CART = 'CART',
	}

	/** One button of the owner in the order of the header: its place in the list. */
	export const HEADER_BUTTON_PREFIX = 'BUTTON_';

	/** The most buttons the owner adds to the header. */
	export const MAX_HEADER_BUTTONS = 4;

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
		/** A form that writes to the store's inbox, and the ways to reach it. */
		CONTACT = 'CONTACT',
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
		[SitePageType.CONTACT]: 'contato',
	};

	/** Every page besides the home, the ready ones among them. */
	export const MAX_PAGES = 20;
	export const MAX_FAQ_ITEMS = 12;

	/** Which corner of the site the chat button sits in. */
	export enum ChatPosition {
		RIGHT = 'RIGHT',
		LEFT = 'LEFT',
	}

	/** How fast the strip of phrases runs; NORMAL is the template's own. */
	export enum MarqueeSpeed {
		SLOW = 'SLOW',
		NORMAL = 'NORMAL',
		FAST = 'FAST',
	}

	/** Which way the strip of phrases runs. */
	export enum MarqueeDirection {
		LEFT = 'LEFT',
		RIGHT = 'RIGHT',
	}

	/** How big the words of the strip are; MEDIUM is the template's own. */
	export enum MarqueeSize {
		SMALL = 'SMALL',
		MEDIUM = 'MEDIUM',
		LARGE = 'LARGE',
	}

	/** The icon beside the words of the cart button. */
	export enum CartButtonIcon {
		NONE = 'NONE',
		BAG = 'BAG',
		CART = 'CART',
	}

	/** How big the cart button is, next to the template's own size. */
	/** The outline of the images of a site; TEMPLATE keeps the template's own. */
	export enum ImageShape {
		TEMPLATE = 'TEMPLATE',
		SQUARE = 'SQUARE',
		SOFT = 'SOFT',
		ROUNDED = 'ROUNDED',
		ARCH = 'ARCH',
		CIRCLE = 'CIRCLE',
		LEAF = 'LEAF',
	}

	/** Width to height of the images of a site; TEMPLATE keeps the template's own. */
	export enum ImageRatio {
		TEMPLATE = 'TEMPLATE',
		SQUARE = 'SQUARE',
		PORTRAIT = 'PORTRAIT',
		TALL = 'TALL',
		LANDSCAPE = 'LANDSCAPE',
		WIDE = 'WIDE',
	}

	/** What lies behind one section of a page. */
	export enum SectionBackgroundType {
		NONE = 'NONE',
		COLOR = 'COLOR',
		GRADIENT = 'GRADIENT',
		IMAGE = 'IMAGE',
	}

	/** The line a border is drawn with. */
	export enum BorderStyle {
		NONE = 'NONE',
		SOLID = 'SOLID',
		DASHED = 'DASHED',
		DOTTED = 'DOTTED',
		DOUBLE = 'DOUBLE',
	}

	/** The thinnest and the thickest border of the header, in pixels. */
	export const HEADER_BORDER_WIDTH_RANGE: [number, number] = [1, 12];

	export enum CartButtonSize {
		SMALL = 'SMALL',
		MEDIUM = 'MEDIUM',
		LARGE = 'LARGE',
	}

	/** The ready icons the owner can pick for the chat button. */
	export enum ChatIcon {
		MESSAGE = 'MESSAGE',
		COMMENT = 'COMMENT',
		CUSTOMER_SERVICE = 'CUSTOMER_SERVICE',
		QUESTION = 'QUESTION',
		SMILE = 'SMILE',
		HEART = 'HEART',
		SHOP = 'SHOP',
		MAIL = 'MAIL',
	}

	/** A field of the customer record the chat's form can ask. */
	export enum ChatCustomerField {
		EMAIL = 'EMAIL',
		PHONE = 'PHONE',
		BIRTH_DATE = 'BIRTH_DATE',
		GENDER = 'GENDER',
		CPF = 'CPF',
		ID_NUMBER = 'ID_NUMBER',
		ADDRESS = 'ADDRESS',
	}

	/** How the chat, or the bag, asks a field. */
	export enum ChatFieldMode {
		REQUIRED = 'REQUIRED',
		OPTIONAL = 'OPTIONAL',
		HIDDEN = 'HIDDEN',
	}

	/** What the bag may ask besides the name; the address is one whole. */
	export enum CheckoutField {
		EMAIL = 'EMAIL',
		PHONE = 'PHONE',
		ADDRESS = 'ADDRESS',
		NOTE = 'NOTE',
	}

	/** How wide the cart window opens. */
	export enum CartWidth {
		NARROW = 'NARROW',
		NORMAL = 'NORMAL',
		WIDE = 'WIDE',
	}

	/** The address of the cart's own page: no page of the owner may take it. */
	export const CART_PAGE_SLUG = 'carrinho';

	/** Where a product's own pages live: /<site>/produto/<id>. No page may take it. */
	export const PRODUCT_PAGE_SLUG = 'produto';

	/** Where a product opens: a window over the page, or a page of its own. */
	export enum ProductDetailsMode {
		MODAL = 'MODAL',
		PAGE = 'PAGE',
	}

	/** Where the cart opens: a window over the page, or a page of its own. */
	export enum CartMode {
		DRAWER = 'DRAWER',
		PAGE = 'PAGE',
	}

	/** The side of the screen the cart window comes from. */
	export enum CartSide {
		RIGHT = 'RIGHT',
		LEFT = 'LEFT',
	}

	/** The kinds of content block an owner can add to the site. */
	export enum BlockType {
		TEAM = 'TEAM',
		TESTIMONIALS = 'TESTIMONIALS',
		LOGOS = 'LOGOS',
		FEATURES = 'FEATURES',
		FAQ = 'FAQ',
		STATS = 'STATS',
		STEPS = 'STEPS',
		CTA = 'CTA',
		// The template's own parts: they draw what their own tab edits.
		HERO = 'HERO',
		MARQUEE = 'MARQUEE',
		CARDS = 'CARDS',
		PRODUCTS = 'PRODUCTS',
		ABOUT = 'ABOUT',
		PAGE_BODY = 'PAGE_BODY',
		// Simple pieces of a page.
		TEXT = 'TEXT',
		BUTTONS = 'BUTTONS',
		IMAGE = 'IMAGE',
		VIDEO = 'VIDEO',
		SPACER = 'SPACER',
		DIVIDER = 'DIVIDER',
		BOX = 'BOX',
		// A menu of tabs: each item shows one other section of its page.
		TABS = 'TABS',
	}

	/** The template's own parts: each at most once on a page. */
	export const PART_TYPES: BlockType[] = [
		BlockType.HERO,
		BlockType.MARQUEE,
		BlockType.CARDS,
		BlockType.PRODUCTS,
		BlockType.ABOUT,
		BlockType.PAGE_BODY,
	];

	/**
	 * The parts a page has at most once. The strip, the cards and the text with
	 * media (the "about") are components with content of their own: a page can
	 * have as many as the owner wants.
	 */
	export const UNIQUE_PART_TYPES: BlockType[] = [
		BlockType.HERO,
		BlockType.PRODUCTS,
		BlockType.PAGE_BODY,
	];

	/** Who draws the cards: the template, its own way, or the owner's choices. */
	export enum CardsLayout {
		TEMPLATE = 'TEMPLATE',
		CUSTOM = 'CUSTOM',
	}

	/** Where the image of one card sits, beside or around its words. */
	export enum CardsImagePosition {
		TOP = 'TOP',
		BOTTOM = 'BOTTOM',
		LEFT = 'LEFT',
		RIGHT = 'RIGHT',
	}

	export enum CardsAlign {
		LEFT = 'LEFT',
		CENTER = 'CENTER',
		RIGHT = 'RIGHT',
	}

	export enum CardsLook {
		PLAIN = 'PLAIN',
		BOXED = 'BOXED',
	}

	export enum CardsGap {
		SMALL = 'SMALL',
		MEDIUM = 'MEDIUM',
		LARGE = 'LARGE',
	}

	/** How many cards go side by side before the next line. */
	export const CARDS_COLUMNS_RANGE: [number, number] = [1, 4];

	export enum SectionAlign {
		LEFT = 'LEFT',
		CENTER = 'CENTER',
	}

	export enum SectionWidth {
		NARROW = 'NARROW',
		WIDE = 'WIDE',
		FULL = 'FULL',
	}

	/** The background of a section, from the site's own colours. */
	export enum SectionTone {
		NONE = 'NONE',
		SOFT = 'SOFT',
		STRONG = 'STRONG',
	}

	export enum DividerStyle {
		LINE = 'LINE',
		DOTS = 'DOTS',
		WAVE = 'WAVE',
	}

	/** The most sections one item of a menu of tabs shows. */
	export const MAX_TAB_SECTIONS = 12;

	/** How a menu of tabs lays its items: in a row on top, or down the side. */
	export enum MenuStyle {
		TABS = 'TABS',
		SIDE = 'SIDE',
	}

	/** What a menu of tabs does: shows one section at a time, or scrolls to it. */
	export enum MenuMode {
		SWITCH = 'SWITCH',
		SCROLL = 'SCROLL',
	}

	/** Which side a menu down the side is on. */
	export enum MenuSide {
		LEFT = 'LEFT',
		RIGHT = 'RIGHT',
	}

	/** How the items of a menu of tabs look. */
	export enum MenuLook {
		PILL = 'PILL',
		UNDERLINE = 'UNDERLINE',
		BOX = 'BOX',
	}

	/** How the section of a menu of tabs comes in when its item is chosen. */
	export enum MenuEffect {
		SLIDE = 'SLIDE',
		FADE = 'FADE',
		ZOOM = 'ZOOM',
		NONE = 'NONE',
	}

	/**
	 * Where a menu of tabs stays while the visitor scrolls what it shows: where
	 * the page put it, stuck to the top (or the side), or as a small floating
	 * button that brings its items back once the menu is out of sight.
	 */
	export enum MenuPlace {
		INLINE = 'INLINE',
		FIXED = 'FIXED',
		FLOATING = 'FLOATING',
	}

	export enum ButtonVariant {
		PRIMARY = 'PRIMARY',
		OUTLINE = 'OUTLINE',
	}

	/** Where the button of a call-to-action block goes. */
	export enum BlockButtonTarget {
		PAGE = 'PAGE',
		WHATSAPP = 'WHATSAPP',
		PHONE = 'PHONE',
		EMAIL = 'EMAIL',
		URL = 'URL',
	}

	/** The ready icons of a feature card. */
	export enum FeatureIcon {
		STAR = 'STAR',
		HEART = 'HEART',
		ROCKET = 'ROCKET',
		SHIELD = 'SHIELD',
		BOLT = 'BOLT',
		CHECK = 'CHECK',
		CLOCK = 'CLOCK',
		GIFT = 'GIFT',
		TRUCK = 'TRUCK',
		SMILE = 'SMILE',
		TROPHY = 'TROPHY',
		BULB = 'BULB',
		TEAM = 'TEAM',
		GLOBAL = 'GLOBAL',
		LOCK = 'LOCK',
		CUSTOMER_SERVICE = 'CUSTOMER_SERVICE',
		HOME = 'HOME',
		SHOP = 'SHOP',
		BAG = 'BAG',
		TAG = 'TAG',
		INFO = 'INFO',
		QUESTION = 'QUESTION',
		PHONE = 'PHONE',
		MAIL = 'MAIL',
	}

	/** Sections of the whole site, every page together. */
	export const MAX_BLOCKS = 60;
	export const MAX_SECTION_BUTTONS = 20;
	export const MAX_BOX_COLUMNS = 20;
	export const MAX_BLOCK_ITEMS = 20;
	export const MAX_FAQ_BLOCK_ITEMS = 20;

	/** Lowercase letters, digits and hyphens, 3 to 40 characters. */
	export const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

	/** What a field of the contact form asks for. */
	export enum ContactFieldType {
		NAME = 'NAME',
		EMAIL = 'EMAIL',
		PHONE = 'PHONE',
		TEXT = 'TEXT',
		TEXTAREA = 'TEXTAREA',
		SELECT = 'SELECT',
	}

	/** Where what the contact form gathers goes. */
	export enum ContactDestination {
		/** The store's inbox here, as a conversation of the site. */
		INBOX = 'INBOX',
		/** An e-mail address of the owner's choice. */
		EMAIL = 'EMAIL',
		/** WhatsApp, opened by the visitor with the message written. */
		WHATSAPP = 'WHATSAPP',
		/** An address of the owner's that receives it as data. */
		WEBHOOK = 'WEBHOOK',
	}

	export const MAX_CONTACT_FIELDS = 12;
	export const MAX_CONTACT_OPTIONS = 12;

	/** What lies behind the whole site: its colour, images in turn or a video. */
	export enum BackdropType {
		COLOR = 'COLOR',
		IMAGES = 'IMAGES',
		VIDEO = 'VIDEO',
	}

	/** How out of focus what lies behind the site is. */
	export enum BackdropBlur {
		NONE = 'NONE',
		SOFT = 'SOFT',
		STRONG = 'STRONG',
	}

	export const MAX_BACKDROP_IMAGES = 6;
	/** How much of the site's colour lies over the backdrop, in percent. */
	export const BACKDROP_VEIL_RANGE: [number, number] = [0, 95];
	export const DEFAULT_BACKDROP_VEIL = 65;

	/** The typefaces an owner may give the site in place of the template's. */
	export enum Font {
		INTER = 'INTER',
		ROBOTO = 'ROBOTO',
		POPPINS = 'POPPINS',
		MONTSERRAT = 'MONTSERRAT',
		OPEN_SANS = 'OPEN_SANS',
		LATO = 'LATO',
		NUNITO = 'NUNITO',
		RALEWAY = 'RALEWAY',
		DM_SANS = 'DM_SANS',
		SPACE_GROTESK = 'SPACE_GROTESK',
		QUICKSAND = 'QUICKSAND',
		PLAYFAIR_DISPLAY = 'PLAYFAIR_DISPLAY',
		LORA = 'LORA',
		MERRIWEATHER = 'MERRIWEATHER',
		CORMORANT_GARAMOND = 'CORMORANT_GARAMOND',
		OSWALD = 'OSWALD',
		BEBAS_NEUE = 'BEBAS_NEUE',
	}

	export const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

	export const MAX_SECTIONS = 6;

	/** The name of a saved mock of the site. */
	export const MAX_MOCK_NAME_LENGTH = 60;
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
