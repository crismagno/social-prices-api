import { IStoreSiteCheckout } from './interfaces/store-site.interface';
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
	};
};
