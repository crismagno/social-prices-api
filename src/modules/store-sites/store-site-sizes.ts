/**
 * The sizes the owner may set on the site, in pixels. Each one is optional:
 * left empty, the template decides. A width or a height is of a picture or a
 * block; for a text, the "size" is that of its letters.
 */
type TSizeKind = 'width' | 'height' | 'blockHeight' | 'fontSize';

const RANGE_BY_KIND: Record<TSizeKind, [number, number]> = {
	width: [16, 1600],
	height: [16, 1200],
	// The entrance of the site: too short and its words do not fit.
	blockHeight: [120, 1600],
	fontSize: [8, 200],
};

const KIND_BY_KEY = {
	logoWidth: 'width',
	logoHeight: 'height',
	brandNameWidth: 'width',
	brandNameHeight: 'height',
	brandNameSize: 'fontSize',
	heroHeight: 'blockHeight',
	heroTitleWidth: 'width',
	heroTitleSize: 'fontSize',
	heroSubtitleWidth: 'width',
	heroSubtitleSize: 'fontSize',
	featuredImageWidth: 'width',
	featuredImageHeight: 'height',
	sectionImageWidth: 'width',
	sectionImageHeight: 'height',
	sectionTitleSize: 'fontSize',
	sectionTextSize: 'fontSize',
	productWidth: 'width',
	productImageHeight: 'height',
	productNameSize: 'fontSize',
} as const satisfies Record<string, TSizeKind>;

export type TSiteSizeKey = keyof typeof KIND_BY_KEY;

export const SITE_SIZE_KEYS: TSiteSizeKey[] = Object.keys(
	KIND_BY_KEY,
) as TSiteSizeKey[];

export type TStoreSiteSizes = Record<TSiteSizeKey, number | null>;

const toSize = (
	value: unknown,
	[min, max]: [number, number],
): number | null => {
	const isNumeric: boolean =
		typeof value === 'number' ||
		(typeof value === 'string' && value.trim() !== '');

	const pixels: number = isNumeric ? Number(value) : NaN;

	if (!Number.isFinite(pixels)) {
		return null;
	}

	return Math.min(max, Math.max(min, Math.round(pixels)));
};

/**
 * The sizes of a site, whatever was stored or sent: only the known ones, whole
 * pixels, pulled back into a range a page can take. Never trusts its input.
 */
export const siteSizesOf = (sizes: unknown): TStoreSiteSizes => {
	const source: Record<string, unknown> =
		sizes && typeof sizes === 'object' && !Array.isArray(sizes)
			? (sizes as Record<string, unknown>)
			: {};

	return SITE_SIZE_KEYS.reduce((result: TStoreSiteSizes, key: TSiteSizeKey) => {
		result[key] = Object.prototype.hasOwnProperty.call(source, key)
			? toSize(source[key], RANGE_BY_KIND[KIND_BY_KEY[key]])
			: null;

		return result;
	}, {} as TStoreSiteSizes);
};
