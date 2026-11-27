import {
	IStoreSiteBlockButton,
	IStoreSiteHeroOptions,
	IStoreSitePageHero,
	THeroSizeKey,
} from './interfaces/store-site.interface';
import StoreSitesEnum from './interfaces/store-sites.enum';
import { buttonOf } from './store-site-blocks';
import { siteSizesOf } from './store-site-sizes';

const MAX_EXTRA_TEXT_LENGTH = 400;

export interface IHeroSlides {
	/** Background images shown after the first one, in turn. */
	backgroundImageUrls: string[];
	/** How long each background stays before the next. */
	slideSeconds: number;
	/** Featured images shown after the first one, in turn. */
	featuredImageUrls: string[];
	/** How long each featured image stays before the next. */
	featuredSlideSeconds: number;
}

const toText = (value: unknown): string =>
	typeof value === 'string' ? value.trim() : '';

/** Extra images after `first`: in order, no blanks, no repeats, at most five. */
const extrasOf = (first: unknown, extras: unknown): string[] => {
	const firstKey: string = toText(first);

	const kept: string[] = (Array.isArray(extras) ? extras : [])
		.map(toText)
		.filter((key: string) => !!key && key !== firstKey);

	return [...new Set(kept)].slice(0, StoreSitesEnum.MAX_HERO_EXTRA_IMAGES);
};

const secondsOf = (value: unknown): number =>
	typeof value === 'number' && Number.isFinite(value)
		? Math.min(
				StoreSitesEnum.MAX_SLIDE_SECONDS,
				Math.max(StoreSitesEnum.MIN_SLIDE_SECONDS, Math.round(value)),
		  )
		: StoreSitesEnum.DEFAULT_SLIDE_SECONDS;

/**
 * The sliders of the entrance (its background and its featured image),
 * whatever was stored or sent. With no extra image there is nothing to slide:
 * each shows its one image, as before.
 */
export const heroSlidesOf = (hero: unknown): IHeroSlides => {
	const source: Record<string, unknown> =
		hero && typeof hero === 'object' ? (hero as Record<string, unknown>) : {};

	return {
		backgroundImageUrls: extrasOf(
			source.backgroundImageUrl,
			source.backgroundImageUrls,
		),
		slideSeconds: secondsOf(source.slideSeconds),
		featuredImageUrls: extrasOf(
			source.featuredImageUrl,
			source.featuredImageUrls,
		),
		featuredSlideSeconds: secondsOf(source.featuredSlideSeconds),
	};
};

const colorOf = (value: unknown): string | null =>
	typeof value === 'string' && StoreSitesEnum.HEX_COLOR_REGEX.test(value.trim())
		? value.trim().toLowerCase()
		: null;

const recordOf = (value: unknown): Record<string, unknown> =>
	value && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};

/** A button of the entrance, or none: the second one needs words to show. */
const heroButtonOf = (
	button: unknown,
	needsLabel: boolean,
): IStoreSiteBlockButton | null => {
	if (!button || typeof button !== 'object' || Array.isArray(button)) {
		return null;
	}

	const checked: IStoreSiteBlockButton = buttonOf(button);

	return needsLabel && !checked.label ? null : checked;
};

/**
 * The owner's choices for the entrance, whatever was stored or sent. A site
 * saved before them shows the entrance as it always was: every piece, the
 * button to the products, no second button and the template's colours.
 */
export const heroOptionsOf = (options: unknown): IStoreSiteHeroOptions => {
	const source: Record<string, unknown> = recordOf(options);
	const colors: Record<string, unknown> = recordOf(source.colors);

	return {
		isTaglineVisible: source.isTaglineVisible !== false,
		isSubtitleVisible: source.isSubtitleVisible !== false,
		isFeaturedVisible: source.isFeaturedVisible !== false,
		isButtonVisible: source.isButtonVisible !== false,
		extraText:
			typeof source.extraText === 'string' && source.extraText.trim()
				? source.extraText.trim().slice(0, MAX_EXTRA_TEXT_LENGTH)
				: null,
		button: heroButtonOf(source.button, false),
		secondButton: heroButtonOf(source.secondButton, true),
		colors: {
			background: colorOf(colors.background),
			text: colorOf(colors.text),
			button: colorOf(colors.button),
		},
	};
};

const MAX_PAGE_HERO_TEXT_LENGTH = 80;
const MAX_IMAGE_KEY_LENGTH = 600;
const PAGE_HERO_HEIGHT_RANGE: [number, number] = [120, 1600];

const shortTextOf = (value: unknown): string | null =>
	toText(value).slice(0, MAX_PAGE_HERO_TEXT_LENGTH) || null;

const imageKeyOf = (value: unknown): string | null => {
	const key: string = toText(value);

	return key && key.length <= MAX_IMAGE_KEY_LENGTH ? key : null;
};

const heightOf = (value: unknown): number | null => {
	const [min, max] = PAGE_HERO_HEIGHT_RANGE;

	return typeof value === 'number' && Number.isFinite(value)
		? Math.min(max, Math.max(min, Math.round(value)))
		: null;
};

/**
 * The entrance of one page, whatever was stored or sent. A page that never
 * got its own has none, and follows the home's as it always did.
 */
export const HERO_SIZE_KEYS: THeroSizeKey[] = [
	'heroTitleWidth',
	'heroTitleSize',
	'heroSubtitleWidth',
	'heroSubtitleSize',
	'featuredImageWidth',
	'featuredImageHeight',
];

/** The sizes an entrance has of its own: only the ones set, within range. */
const heroSizesOf = (
	sizes: unknown,
): Partial<Record<THeroSizeKey, number | null>> => {
	const all = siteSizesOf(sizes);

	return HERO_SIZE_KEYS.reduce(
		(own: Partial<Record<THeroSizeKey, number | null>>, key: THeroSizeKey) =>
			all[key] === null ? own : { ...own, [key]: all[key] },
		{},
	);
};

export const pageHeroOf = (hero: unknown): IStoreSitePageHero | null => {
	if (!hero || typeof hero !== 'object' || Array.isArray(hero)) {
		return null;
	}

	const source: Record<string, unknown> = hero as Record<string, unknown>;

	return {
		tagline: shortTextOf(source.tagline),
		ctaLabel: shortTextOf(source.ctaLabel),
		backgroundImageUrl: imageKeyOf(source.backgroundImageUrl),
		featuredImageUrl: imageKeyOf(source.featuredImageUrl),
		height: heightOf(source.height),
		options: heroOptionsOf(source.options),
		...heroSlidesOf(source),
		sizes: heroSizesOf(source.sizes),
	};
};
