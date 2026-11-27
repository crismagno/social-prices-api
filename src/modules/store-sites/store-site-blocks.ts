import { randomBytes } from 'crypto';

import {
	IStoreSiteAboutMedia,
	IStoreSiteBlock,
	IStoreSiteBlockButton,
	IStoreSiteBlockItem,
	IStoreSiteBlockSettings,
} from './interfaces/store-site.interface';
import StoreSitesEnum from './interfaces/store-sites.enum';
import { embedUrlOf } from './store-site-about';
import { safeFooterUrl } from './store-site-footer';

const KEY = /^[a-z0-9-]{1,40}$/;
const MAX_KICKER = 40;
const MAX_TITLE = 120;
const MAX_SUBTITLE = 300;
const MAX_ITEM_TITLE = 80;
const MAX_ITEM_SUBTITLE = 80;
const MAX_ITEM_TEXT = 600;
const MAX_IMAGE_KEY = 600;
const MAX_BUTTON_LABEL = 30;
const MAX_BUTTON_VALUE = 300;
// A text piece is a whole text, not a line under a title.
const MAX_TEXT_BODY = 2000;
const MIN_SPACER = 8;
const MAX_SPACER = 240;
const DEFAULT_SPACER = 48;

const T = StoreSitesEnum.BlockType;

const isPart = (type: StoreSitesEnum.BlockType): boolean =>
	StoreSitesEnum.PART_TYPES.includes(type);

type TRecord = Record<string, unknown>;

const recordOf = (value: unknown): TRecord =>
	value && typeof value === 'object' && !Array.isArray(value)
		? (value as TRecord)
		: {};

const textOf = (value: unknown, max: number): string | null =>
	typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;

const oneOf = <T extends string>(value: unknown, options: T[]): T | null =>
	options.includes(value as T) ? (value as T) : null;

const newKey = (): string => randomBytes(6).toString('hex');

/** A key of its own: the one given when it is good and not taken. */
const keyOf = (value: unknown, taken: Set<string>): string => {
	const given: string = typeof value === 'string' ? value : '';

	const key: string = KEY.test(given) && !taken.has(given) ? given : newKey();

	taken.add(key);

	return key;
};

const ratingOf = (value: unknown): number =>
	typeof value === 'number' && Number.isFinite(value)
		? Math.min(5, Math.max(1, Math.round(value)))
		: 5;

/** Whether an item has what its type shows; an item without it is dropped. */
const isUsable = (
	type: StoreSitesEnum.BlockType,
	item: IStoreSiteBlockItem,
): boolean => {
	switch (type) {
		case StoreSitesEnum.BlockType.TESTIMONIALS:
			return !!item.text;
		case StoreSitesEnum.BlockType.LOGOS:
			return !!item.imageUrl || !!item.title;
		case StoreSitesEnum.BlockType.FAQ:
			return !!item.title && !!item.text;
		case StoreSitesEnum.BlockType.TEAM:
			return !!item.title || !!item.imageUrl;
		case StoreSitesEnum.BlockType.IMAGE:
			return !!item.imageUrl;
		case StoreSitesEnum.BlockType.BOX:
			return !!item.title || !!item.text || !!item.imageUrl || !!item.button;
		default:
			return !!item.title || !!item.text;
	}
};

/** Types whose content lives in the items list. */
const WITH_ITEMS: StoreSitesEnum.BlockType[] = [
	T.TEAM,
	T.TESTIMONIALS,
	T.LOGOS,
	T.FEATURES,
	T.FAQ,
	T.STATS,
	T.STEPS,
	T.IMAGE,
	T.BOX,
	T.TABS,
];

export const maxItemsOf = (type: StoreSitesEnum.BlockType): number => {
	switch (type) {
		case T.FAQ:
			return StoreSitesEnum.MAX_FAQ_BLOCK_ITEMS;
		case T.BOX:
			return StoreSitesEnum.MAX_BOX_COLUMNS;
		case T.IMAGE:
			return 1;
		default:
			return StoreSitesEnum.MAX_BLOCK_ITEMS;
	}
};

const itemsOf = (
	type: StoreSitesEnum.BlockType,
	items: unknown,
): IStoreSiteBlockItem[] => {
	if (!WITH_ITEMS.includes(type) || !Array.isArray(items)) {
		return [];
	}

	const taken: Set<string> = new Set();

	return items
		.map((raw: unknown) => {
			const source: TRecord = recordOf(raw);

			const item: IStoreSiteBlockItem = {
				key: '',
				// Whether that section is there, the site says when it draws.
				sectionKey: type === T.TABS ? textOf(source.sectionKey, 40) : null,
				title: textOf(source.title, MAX_ITEM_TITLE),
				subtitle: textOf(source.subtitle, MAX_ITEM_SUBTITLE),
				text: textOf(source.text, MAX_ITEM_TEXT),
				imageUrl: textOf(source.imageUrl, MAX_IMAGE_KEY),
				icon:
					type === StoreSitesEnum.BlockType.FEATURES
						? oneOf(source.icon, Object.values(StoreSitesEnum.FeatureIcon)) ??
						  StoreSitesEnum.FeatureIcon.STAR
						: null,
				rating:
					type === StoreSitesEnum.BlockType.TESTIMONIALS
						? ratingOf(source.rating)
						: null,
				button:
					type === T.BOX && source.button ? buttonOf(source.button) : null,
			};

			return { item, key: source.key };
		})
		.filter(({ item }) => isUsable(type, item))
		.slice(0, maxItemsOf(type))
		.map(({ item, key }) => ({ ...item, key: keyOf(key, taken) }));
};

export const buttonOf = (button: unknown): IStoreSiteBlockButton => {
	const source: TRecord = recordOf(button);

	const target: StoreSitesEnum.BlockButtonTarget =
		oneOf(source.target, Object.values(StoreSitesEnum.BlockButtonTarget)) ??
		StoreSitesEnum.BlockButtonTarget.PAGE;

	const isPage: boolean = target === StoreSitesEnum.BlockButtonTarget.PAGE;

	return {
		label: textOf(source.label, MAX_BUTTON_LABEL),
		target,
		pageKey: isPage ? textOf(source.pageKey, 40) : null,
		value: isPage ? null : textOf(source.value, MAX_BUTTON_VALUE),
		variant:
			oneOf(source.variant, Object.values(StoreSitesEnum.ButtonVariant)) ??
			StoreSitesEnum.ButtonVariant.PRIMARY,
	};
};

const buttonsOf = (
	type: StoreSitesEnum.BlockType,
	buttons: unknown,
): IStoreSiteBlockButton[] =>
	type === T.BUTTONS && Array.isArray(buttons)
		? buttons.slice(0, StoreSitesEnum.MAX_SECTION_BUTTONS).map(buttonOf)
		: [];

const mediaOf = (raw: unknown): IStoreSiteAboutMedia | null => {
	const source: TRecord = recordOf(raw);

	if (source.type === StoreSitesEnum.AboutMediaType.EMBED) {
		const url: string | null = embedUrlOf(source.url);

		return url ? { type: StoreSitesEnum.AboutMediaType.EMBED, url } : null;
	}

	const key: string | null =
		source.type === StoreSitesEnum.AboutMediaType.VIDEO
			? textOf(source.url, MAX_IMAGE_KEY)
			: null;

	return key ? { type: StoreSitesEnum.AboutMediaType.VIDEO, url: key } : null;
};

/** The options of a piece; each kept only by the types that use it. */
const settingsOf = (
	type: StoreSitesEnum.BlockType,
	raw: unknown,
): IStoreSiteBlockSettings => {
	const source: TRecord = recordOf(raw);

	const uses = (...types: StoreSitesEnum.BlockType[]): boolean =>
		types.includes(type);

	const height: unknown = source.height;

	return {
		align: uses(T.TEXT, T.BUTTONS, T.IMAGE, T.BOX, T.TABS)
			? oneOf(source.align, Object.values(StoreSitesEnum.SectionAlign)) ??
			  StoreSitesEnum.SectionAlign.CENTER
			: null,
		width: uses(T.IMAGE, T.VIDEO, T.BOX)
			? oneOf(source.width, Object.values(StoreSitesEnum.SectionWidth)) ??
			  StoreSitesEnum.SectionWidth.WIDE
			: null,
		tone: uses(T.TEXT, T.BOX, T.TABS)
			? oneOf(source.tone, Object.values(StoreSitesEnum.SectionTone)) ??
			  StoreSitesEnum.SectionTone.NONE
			: null,
		height: uses(T.SPACER)
			? typeof height === 'number' && Number.isFinite(height)
				? Math.min(MAX_SPACER, Math.max(MIN_SPACER, Math.round(height)))
				: DEFAULT_SPACER
			: null,
		divider: uses(T.DIVIDER)
			? oneOf(source.divider, Object.values(StoreSitesEnum.DividerStyle)) ??
			  StoreSitesEnum.DividerStyle.LINE
			: null,
		media: uses(T.VIDEO) ? mediaOf(source.media) : null,
		menuStyle: uses(T.TABS)
			? oneOf(source.menuStyle, Object.values(StoreSitesEnum.MenuStyle)) ??
			  StoreSitesEnum.MenuStyle.TABS
			: null,
		menuMode: uses(T.TABS)
			? oneOf(source.menuMode, Object.values(StoreSitesEnum.MenuMode)) ??
			  StoreSitesEnum.MenuMode.SWITCH
			: null,
		menuSide: uses(T.TABS)
			? oneOf(source.menuSide, Object.values(StoreSitesEnum.MenuSide)) ??
			  StoreSitesEnum.MenuSide.LEFT
			: null,
		menuLook: uses(T.TABS)
			? oneOf(source.menuLook, Object.values(StoreSitesEnum.MenuLook)) ??
			  StoreSitesEnum.MenuLook.PILL
			: null,
		menuEffect: uses(T.TABS)
			? oneOf(source.menuEffect, Object.values(StoreSitesEnum.MenuEffect)) ??
			  StoreSitesEnum.MenuEffect.SLIDE
			: null,
	};
};

/** Whether a piece has what it shows; a piece without it is left out. */
const hasContent = (block: IStoreSiteBlock): boolean => {
	switch (block.type) {
		case T.TEXT:
			return !!block.title || !!block.subtitle;
		case T.BUTTONS:
			return block.buttons.length > 0;
		case T.IMAGE:
		case T.BOX:
			return block.items.length > 0;
		case T.VIDEO:
			return !!block.settings.media;
		default:
			return true;
	}
};

const FOOTER_TYPE_OF: Partial<
	Record<StoreSitesEnum.BlockButtonTarget, StoreSitesEnum.FooterLinkType>
> = {
	[StoreSitesEnum.BlockButtonTarget.WHATSAPP]:
		StoreSitesEnum.FooterLinkType.WHATSAPP,
	[StoreSitesEnum.BlockButtonTarget.PHONE]: StoreSitesEnum.FooterLinkType.PHONE,
	[StoreSitesEnum.BlockButtonTarget.EMAIL]: StoreSitesEnum.FooterLinkType.EMAIL,
	[StoreSitesEnum.BlockButtonTarget.URL]: StoreSitesEnum.FooterLinkType.WEBSITE,
};

/**
 * Where a button goes, or null when it goes nowhere safe. A page target gives
 * '' when its page exists (or is the home): the site builds its own address.
 */
export const blockButtonHref = (
	button: IStoreSiteBlockButton,
	pageKeys: string[],
): string | null => {
	if (button.target === StoreSitesEnum.BlockButtonTarget.PAGE) {
		return button.pageKey === null || pageKeys.includes(button.pageKey)
			? ''
			: null;
	}

	const type: StoreSitesEnum.FooterLinkType | undefined =
		FOOTER_TYPE_OF[button.target];

	return type ? safeFooterUrl(type, button.value) : null;
};

/**
 * The sections of a site, whatever was stored or sent: known types only,
 * texts cut to size, at most 60 sections, the template's parts at most once
 * on a page (and the page's own content never on the home), and items
 * without what their type shows left out. Pieces still being filled stay.
 */
export const siteBlocksOf = (blocks: unknown): IStoreSiteBlock[] => {
	if (!Array.isArray(blocks)) {
		return [];
	}

	const taken: Set<string> = new Set();
	const partsSeen: Set<string> = new Set();

	return blocks
		.map((raw: unknown) => recordOf(raw))
		.filter((source: TRecord) =>
			Object.values(StoreSitesEnum.BlockType).includes(
				source.type as StoreSitesEnum.BlockType,
			),
		)
		.map((source: TRecord): IStoreSiteBlock => {
			const type = source.type as StoreSitesEnum.BlockType;
			// A part draws what its own tab edits: it has nothing of its own.
			const part: boolean = isPart(type);

			return {
				key: keyOf(source.key, taken),
				type,
				isActive: source.isActive !== false,
				pageKey: textOf(source.pageKey, 40),
				kicker: part ? null : textOf(source.kicker, MAX_KICKER),
				title: part ? null : textOf(source.title, MAX_TITLE),
				subtitle: part
					? null
					: textOf(
							source.subtitle,
							type === T.TEXT ? MAX_TEXT_BODY : MAX_SUBTITLE,
					  ),
				items: itemsOf(type, source.items),
				button: type === T.CTA ? buttonOf(source.button) : null,
				buttons: buttonsOf(type, source.buttons),
				settings: settingsOf(type, source.settings),
			};
		})
		.filter((block: IStoreSiteBlock) => {
			// A piece still being filled is kept: the site shows it once it is.
			if (!isPart(block.type)) {
				return true;
			}

			const seen: string = `${block.pageKey ?? ''}:${block.type}`;

			if (
				partsSeen.has(seen) ||
				(block.type === T.PAGE_BODY && block.pageKey === null)
			) {
				return false;
			}

			partsSeen.add(seen);

			return true;
		})
		.slice(0, StoreSitesEnum.MAX_BLOCKS);
};

const isSafe =
	(pageKeys: string[]) =>
	(button: IStoreSiteBlockButton | null): boolean =>
		!!button && blockButtonHref(button, pageKeys) !== null;

/**
 * What visitors see: the active blocks of the home and of pages that exist,
 * that have something to show. A button that goes nowhere safe is dropped,
 * the block stays.
 */
export const publicBlocksOf = (
	blocks: unknown,
	pageKeys: string[],
): IStoreSiteBlock[] =>
	siteBlocksOf(blocks)
		.filter(
			(block: IStoreSiteBlock) =>
				// A hidden entrance is kept: without it in the list the site would
				// take the page for one arranged before the entrance could be moved,
				// and show it at the top.
				(block.isActive || block.type === T.HERO) &&
				(block.pageKey === null || pageKeys.includes(block.pageKey)) &&
				(isPart(block.type) ||
					!WITH_ITEMS.includes(block.type) ||
					block.type === T.IMAGE ||
					block.type === T.BOX ||
					block.items.length > 0) &&
				(block.type !== T.CTA || !!block.title),
		)
		.map((block: IStoreSiteBlock) => ({
			...block,
			button: isSafe(pageKeys)(block.button) ? block.button : null,
			buttons: block.buttons.filter(isSafe(pageKeys)),
			items: block.items.map((item: IStoreSiteBlockItem) => ({
				...item,
				button: isSafe(pageKeys)(item.button) ? item.button : null,
			})),
		}))
		// A piece with nothing to show (no image yet, no safe button) stays out.
		.filter((block: IStoreSiteBlock) => hasContent(block));
