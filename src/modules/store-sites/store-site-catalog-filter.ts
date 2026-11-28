import StoreSitesEnum from './interfaces/store-sites.enum';

/** The colours of the filter of products; empty, the site's own. */
export interface IStoreSiteCatalogFilterColors {
	background: string | null;
	text: string | null;
	accent: string | null;
}

/**
 * The filter of the page of products: a panel that floats on one side, with
 * the ways of narrowing the products the owner left on.
 */
export interface IStoreSiteCatalogFilter {
	isShown: boolean;
	side: StoreSitesEnum.CatalogFilterSide;
	/** Its heading; empty, the site says its own. */
	title: string | null;
	/** Each way of filtering, on or off. */
	fields: Record<StoreSitesEnum.CatalogFilterField, boolean>;
	colors: IStoreSiteCatalogFilterColors;
}

export const MAX_FILTER_TITLE: number = 40;

const recordOf = (value: unknown): Record<string, unknown> =>
	value && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};

const hexOf = (value: unknown): string | null =>
	typeof value === 'string' && StoreSitesEnum.HEX_COLOR_REGEX.test(value)
		? value
		: null;

/**
 * The filter of a site, whatever was stored or sent. A site saved before it
 * existed has none; once on, every way of filtering is there until the owner
 * turns it off.
 */
export const catalogFilterOf = (filter: unknown): IStoreSiteCatalogFilter => {
	const source: Record<string, unknown> = recordOf(filter);
	const fields: Record<string, unknown> = recordOf(source.fields);
	const colors: Record<string, unknown> = recordOf(source.colors);

	return {
		isShown: source.isShown === true,
		side:
			source.side === StoreSitesEnum.CatalogFilterSide.RIGHT
				? StoreSitesEnum.CatalogFilterSide.RIGHT
				: StoreSitesEnum.CatalogFilterSide.LEFT,
		title:
			typeof source.title === 'string' && source.title.trim()
				? source.title.trim().slice(0, MAX_FILTER_TITLE)
				: null,
		fields: Object.values(StoreSitesEnum.CatalogFilterField).reduce(
			(
				kept: Record<StoreSitesEnum.CatalogFilterField, boolean>,
				field: StoreSitesEnum.CatalogFilterField,
			) => ({ ...kept, [field]: fields[field] !== false }),
			{} as Record<StoreSitesEnum.CatalogFilterField, boolean>,
		),
		colors: {
			background: hexOf(colors.background),
			text: hexOf(colors.text),
			accent: hexOf(colors.accent),
		},
	};
};
