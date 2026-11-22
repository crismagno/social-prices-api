import StoreSitesEnum from './interfaces/store-sites.enum';

export interface IHeroSlides {
	/** Background images shown after the first one, in turn. */
	backgroundImageUrls: string[];
	/** How long each image stays before the next. */
	slideSeconds: number;
}

/**
 * The slider of the entrance, whatever was stored or sent. With no extra image
 * there is nothing to slide: the entrance shows its one background, as before.
 */
export const heroSlidesOf = (hero: unknown): IHeroSlides => {
	const source: Record<string, unknown> =
		hero && typeof hero === 'object' ? (hero as Record<string, unknown>) : {};

	const first: string =
		typeof source.backgroundImageUrl === 'string'
			? source.backgroundImageUrl.trim()
			: '';

	const extras: string[] = (
		Array.isArray(source.backgroundImageUrls) ? source.backgroundImageUrls : []
	)
		.filter((url: unknown): url is string => typeof url === 'string')
		.map((url: string) => url.trim())
		.filter((url: string) => !!url && url !== first);

	const seconds: number = Number(source.slideSeconds);

	return {
		backgroundImageUrls: [...new Set(extras)].slice(
			0,
			StoreSitesEnum.MAX_HERO_EXTRA_IMAGES,
		),
		slideSeconds:
			typeof source.slideSeconds === 'number' && Number.isFinite(seconds)
				? Math.min(
						StoreSitesEnum.MAX_SLIDE_SECONDS,
						Math.max(StoreSitesEnum.MIN_SLIDE_SECONDS, Math.round(seconds)),
				  )
				: StoreSitesEnum.DEFAULT_SLIDE_SECONDS,
	};
};
