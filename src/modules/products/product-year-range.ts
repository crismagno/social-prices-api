import { IProductYearRange } from './interfaces/product.interface';

/** The years a product can be said to be for. */
export const PRODUCT_YEAR_LIMITS: [number, number] = [1800, 2200];

/** A year, whole and within what can be one, or nothing. */
const yearOf = (value: unknown): number | null => {
	const year: number =
		typeof value === 'number'
			? value
			: typeof value === 'string' && value.trim()
			? Number(value)
			: NaN;

	const [min, max] = PRODUCT_YEAR_LIMITS;

	return Number.isInteger(year) && year >= min && year <= max ? year : null;
};

/**
 * The years a product is for, whatever was sent: as it is, or as the text a
 * form with files sends it in. A year that cannot be one is left out; with
 * neither, the product is for no years in particular. The first year is never
 * after the last: given the other way round, they change places.
 */
export const parseYearRange = (raw: unknown): IProductYearRange | null => {
	let source: unknown = raw;

	if (typeof raw === 'string') {
		try {
			source = JSON.parse(raw);
		} catch {
			return null;
		}
	}

	if (!source || typeof source !== 'object' || Array.isArray(source)) {
		return null;
	}

	const from: number | null = yearOf((source as Record<string, unknown>).from);
	const to: number | null = yearOf((source as Record<string, unknown>).to);

	if (from === null && to === null) {
		return null;
	}

	return from !== null && to !== null && from > to
		? { from: to, to: from }
		: { from, to };
};

/** The years as words: "2015–2018", "2015", "2015+", "–2018"; none, nothing. */
export const yearRangeLabel = (
	range: IProductYearRange | null | undefined,
): string => {
	const from: number | null = range?.from ?? null;
	const to: number | null = range?.to ?? null;

	if (from === null && to === null) {
		return '';
	}

	if (from !== null && to !== null) {
		return from === to ? `${from}` : `${from}–${to}`;
	}

	return from !== null ? `${from}+` : `–${to}`;
};
