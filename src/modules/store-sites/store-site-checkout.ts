import {
	IStoreSiteCartLook,
	IStoreSiteCheckout,
} from './interfaces/store-site.interface';
import StoreSitesEnum from './interfaces/store-sites.enum';

const Field = StoreSitesEnum.CheckoutField;
const Mode = StoreSitesEnum.ChatFieldMode;

/** As every site asked before the owner could choose: all of it but the note. */
const DEFAULT_MODES: Record<
	StoreSitesEnum.CheckoutField,
	StoreSitesEnum.ChatFieldMode
> = {
	[Field.EMAIL]: Mode.REQUIRED,
	[Field.PHONE]: Mode.REQUIRED,
	[Field.ADDRESS]: Mode.REQUIRED,
	[Field.NOTE]: Mode.OPTIONAL,
};

export const CART_TITLE_MAX = 40;
export const CART_SHIPPING_NOTE_MAX = 200;
export const CART_BUTTON_LABEL_MAX = 30;

const textOf = (value: unknown, max: number): string | null =>
	typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;

const oneOf = <T extends string>(
	values: T[],
	value: unknown,
	fallback: T,
): T => (values.includes(value as T) ? (value as T) : fallback);

/** The cart window as the owner set it; whatever is missing shows as before. */
export const cartLookOf = (look: unknown): IStoreSiteCartLook => {
	const source: Record<string, unknown> =
		look && typeof look === 'object' && !Array.isArray(look)
			? (look as Record<string, unknown>)
			: {};

	const shownUnlessOff = (key: string): boolean => source[key] !== false;

	return {
		title: textOf(source.title, CART_TITLE_MAX),
		mode: oneOf(
			Object.values(StoreSitesEnum.CartMode),
			source.mode,
			StoreSitesEnum.CartMode.DRAWER,
		),
		width: oneOf(
			Object.values(StoreSitesEnum.CartWidth),
			source.width,
			StoreSitesEnum.CartWidth.NORMAL,
		),
		side: oneOf(
			Object.values(StoreSitesEnum.CartSide),
			source.side,
			StoreSitesEnum.CartSide.RIGHT,
		),
		isPhotoShown: shownUnlessOff('isPhotoShown'),
		isBrandShown: shownUnlessOff('isBrandShown'),
		isDescriptionShown: shownUnlessOff('isDescriptionShown'),
		isTagsShown: shownUnlessOff('isTagsShown'),
		isProductOpened: shownUnlessOff('isProductOpened'),
		isShippingNoteShown: shownUnlessOff('isShippingNoteShown'),
		shippingNote: textOf(source.shippingNote, CART_SHIPPING_NOTE_MAX),
		buttonLabel: textOf(source.buttonLabel, CART_BUTTON_LABEL_MAX),
	};
};

/**
 * What the bag asks before an order is sent, whatever was stored or sent: for
 * each field, asked and needed, asked but free to skip, or not asked. The
 * name is not here: an order always has one.
 */
export const siteCheckoutOf = (checkout: unknown): IStoreSiteCheckout => {
	const source: Record<string, unknown> =
		checkout && typeof checkout === 'object' && !Array.isArray(checkout)
			? (checkout as Record<string, unknown>)
			: {};

	const fields: Record<string, unknown> =
		source.fields &&
		typeof source.fields === 'object' &&
		!Array.isArray(source.fields)
			? (source.fields as Record<string, unknown>)
			: {};

	return {
		fields: Object.values(Field).reduce(
			(result, field: StoreSitesEnum.CheckoutField) => ({
				...result,
				[field]: Object.values(Mode).includes(
					fields[field] as StoreSitesEnum.ChatFieldMode,
				)
					? (fields[field] as StoreSitesEnum.ChatFieldMode)
					: DEFAULT_MODES[field],
			}),
			{} as IStoreSiteCheckout['fields'],
		),
		look: cartLookOf(source.look),
	};
};
