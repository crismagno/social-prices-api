import { randomBytes } from 'crypto';

import {
	IStoreSiteBlock,
	IStoreSiteBlockButton,
	IStoreSiteBlockItem,
} from './interfaces/store-site.interface';
import StoreSitesEnum from './interfaces/store-sites.enum';
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
		default:
			return !!item.title || !!item.text;
	}
};

export const maxItemsOf = (type: StoreSitesEnum.BlockType): number =>
	type === StoreSitesEnum.BlockType.FAQ
		? StoreSitesEnum.MAX_FAQ_BLOCK_ITEMS
		: StoreSitesEnum.MAX_BLOCK_ITEMS;

const itemsOf = (
	type: StoreSitesEnum.BlockType,
	items: unknown,
): IStoreSiteBlockItem[] => {
	if (type === StoreSitesEnum.BlockType.CTA || !Array.isArray(items)) {
		return [];
	}

	const taken: Set<string> = new Set();

	return items
		.map((raw: unknown) => {
			const source: TRecord = recordOf(raw);

			const item: IStoreSiteBlockItem = {
				key: '',
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
			};

			return { item, key: source.key };
		})
		.filter(({ item }) => isUsable(type, item))
		.slice(0, maxItemsOf(type))
		.map(({ item, key }) => ({ ...item, key: keyOf(key, taken) }));
};

const buttonOf = (button: unknown): IStoreSiteBlockButton => {
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
	};
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
 * The blocks of a site, whatever was stored or sent: known types only, texts
 * cut to size, at most 20 blocks and 12 items each (20 questions), and items
 * without what their type shows left out.
 */
export const siteBlocksOf = (blocks: unknown): IStoreSiteBlock[] => {
	if (!Array.isArray(blocks)) {
		return [];
	}

	const taken: Set<string> = new Set();

	return blocks
		.map((raw: unknown) => recordOf(raw))
		.filter((source: TRecord) =>
			Object.values(StoreSitesEnum.BlockType).includes(
				source.type as StoreSitesEnum.BlockType,
			),
		)
		.slice(0, StoreSitesEnum.MAX_BLOCKS)
		.map((source: TRecord): IStoreSiteBlock => {
			const type = source.type as StoreSitesEnum.BlockType;

			return {
				key: keyOf(source.key, taken),
				type,
				isActive: source.isActive !== false,
				pageKey: textOf(source.pageKey, 40),
				kicker: textOf(source.kicker, MAX_KICKER),
				title: textOf(source.title, MAX_TITLE),
				subtitle: textOf(source.subtitle, MAX_SUBTITLE),
				items: itemsOf(type, source.items),
				button:
					type === StoreSitesEnum.BlockType.CTA
						? buttonOf(source.button)
						: null,
			};
		});
};

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
				block.isActive &&
				(block.pageKey === null || pageKeys.includes(block.pageKey)) &&
				(block.type === StoreSitesEnum.BlockType.CTA
					? !!block.title
					: block.items.length > 0),
		)
		.map((block: IStoreSiteBlock) => ({
			...block,
			button:
				block.button && blockButtonHref(block.button, pageKeys) !== null
					? block.button
					: null,
		}));
