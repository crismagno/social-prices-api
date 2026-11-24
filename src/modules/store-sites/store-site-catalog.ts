import { IStoreSiteCatalog } from './interfaces/store-site.interface';

/**
 * How a site shows its products, whatever was stored or sent. A site saved
 * before this existed shows the name, the price and the search, and no
 * description: what it showed until then, plus the search.
 */
export const siteCatalogOf = (catalog: unknown): IStoreSiteCatalog => {
	const source: Record<string, unknown> =
		catalog && typeof catalog === 'object'
			? (catalog as Record<string, unknown>)
			: {};

	return {
		isNameShown: source.isNameShown !== false,
		isPriceShown: source.isPriceShown !== false,
		isDescriptionShown: source.isDescriptionShown === true,
		isSearchShown: source.isSearchShown !== false,
	};
};
