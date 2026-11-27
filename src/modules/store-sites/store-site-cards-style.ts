import {
	IStoreSiteCardLook,
	IStoreSiteCardsStyle,
} from './interfaces/store-site.interface';
import StoreSitesEnum from './interfaces/store-sites.enum';

const oneOf = <T extends string>(
	value: unknown,
	options: T[],
	fallback: T,
): T => (options.includes(value as T) ? (value as T) : fallback);

const recordOf = (value: unknown): Record<string, unknown> =>
	value && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};

/** A number of places within what a line can have, or the one given. */
const placesOf = (value: unknown, fallback: number): number => {
	const [min, max] = StoreSitesEnum.CARDS_COLUMNS_RANGE;

	return typeof value === 'number' && Number.isFinite(value)
		? Math.min(max, Math.max(min, Math.round(value)))
		: fallback;
};

const DEFAULT_COLUMNS = 3;

/**
 * The line cards are laid out on, whatever was stored or sent: as the
 * template draws them unless the owner chose otherwise, and then three places
 * a line.
 */
export const siteCardsStyleOf = (style: unknown): IStoreSiteCardsStyle => {
	const source: Record<string, unknown> = recordOf(style);

	return {
		layout: oneOf(
			source.layout,
			Object.values(StoreSitesEnum.CardsLayout),
			StoreSitesEnum.CardsLayout.TEMPLATE,
		),
		columns: placesOf(source.columns, DEFAULT_COLUMNS),
		gap: oneOf(
			source.gap,
			Object.values(StoreSitesEnum.CardsGap),
			StoreSitesEnum.CardsGap.MEDIUM,
		),
	};
};

/**
 * How one card is drawn, whatever was stored or sent: its image on top, its
 * words to the left, nothing around it and one place of the line, until the
 * owner chooses each for that card.
 */
export const siteCardLookOf = (look: unknown): IStoreSiteCardLook => {
	const source: Record<string, unknown> = recordOf(look);

	return {
		imagePosition: oneOf(
			source.imagePosition,
			Object.values(StoreSitesEnum.CardsImagePosition),
			StoreSitesEnum.CardsImagePosition.TOP,
		),
		textAlign: oneOf(
			source.textAlign,
			Object.values(StoreSitesEnum.CardsAlign),
			StoreSitesEnum.CardsAlign.LEFT,
		),
		look: oneOf(
			source.look,
			Object.values(StoreSitesEnum.CardsLook),
			StoreSitesEnum.CardsLook.PLAIN,
		),
		span: placesOf(source.span, 1),
	};
};
