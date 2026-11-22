namespace StoreSitesEnum {
	export enum Template {
		AURORA = 'AURORA',
		IMPACT = 'IMPACT',
		ATELIER = 'ATELIER',
		GARDEN = 'GARDEN',
		STUDIO = 'STUDIO',
	}

	export const TemplateLabels = {
		[Template.AURORA]: 'Aurora',
		[Template.IMPACT]: 'Impact',
		[Template.ATELIER]: 'Atelier',
		[Template.GARDEN]: 'Garden',
		[Template.STUDIO]: 'Studio',
	};

	/** Lowercase letters, digits and hyphens, 3 to 40 characters. */
	export const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

	export const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

	export const MAX_SECTIONS = 6;
	export const MAX_MARQUEE_ITEMS = 8;
	export const MAX_PRODUCTS = 60;

	export const MAX_ORDER_ITEMS = 50;
	export const MAX_ORDER_ITEM_QUANTITY = 99;

	/** Orders one visitor may send a minute. */
	export const ORDERS_PER_MINUTE = 5;

	/** Orders one site may receive a minute, from everyone together. */
	export const ORDERS_PER_MINUTE_PER_SITE = 60;

	export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
}

export default StoreSitesEnum;
