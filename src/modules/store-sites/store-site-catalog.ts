import { IStoreSiteCatalog } from './interfaces/store-site.interface';

/**
 * How a site shows its products, whatever was stored or sent. A site saved
 * before this existed shows the name, the price and the search, and no
 * description: what it showed until then, plus the search. It sells by
 * default; the owner can make the products only shown.
 */
const MAX_TITLE_LENGTH = 60;
const MAX_ADD_LABEL_LENGTH = 30;

const textOf = (value: unknown, max: number): string | null =>
	typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;

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
		isAddButtonShown: source.isAddButtonShown !== false,
		isDetailsOpened: source.isDetailsOpened !== false,
		isTitleShown: source.isTitleShown !== false,
		title: textOf(source.title, MAX_TITLE_LENGTH),
		addLabel: textOf(source.addLabel, MAX_ADD_LABEL_LENGTH),
	};
};
