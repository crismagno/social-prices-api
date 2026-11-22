import StoreSitesEnum from './interfaces/store-sites.enum';

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
