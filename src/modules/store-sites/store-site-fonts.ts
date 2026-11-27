import { IStoreSiteFonts } from './interfaces/store-site.interface';
import StoreSitesEnum from './interfaces/store-sites.enum';

const FONTS: string[] = Object.values(StoreSitesEnum.Font);

/** One of the typefaces on offer, or none: the template's own. */
const fontOf = (value: unknown): StoreSitesEnum.Font | null =>
	typeof value === 'string' && FONTS.includes(value)
		? (value as StoreSitesEnum.Font)
		: null;

/**
 * The typefaces of a site, whatever was stored or sent: the template's own
 * unless the owner chose one of those on offer.
 */
export const siteFontsOf = (fonts: unknown): IStoreSiteFonts => {
	const source: Record<string, unknown> =
		fonts && typeof fonts === 'object' && !Array.isArray(fonts)
			? (fonts as Record<string, unknown>)
			: {};

	return {
		heading: fontOf(source.heading),
		body: fontOf(source.body),
	};
};
