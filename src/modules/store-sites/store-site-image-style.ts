import {
	IStoreSiteImageLook,
	IStoreSiteImageStyle,
} from './interfaces/store-site.interface';
import StoreSitesEnum from './interfaces/store-sites.enum';

const objectOf = (value: unknown): Record<string, unknown> =>
	value && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};

const oneOf = <T extends string>(
	value: unknown,
	options: T[],
	fallback: T,
): T => (options.includes(value as T) ? (value as T) : fallback);

const lookOf = (look: unknown): IStoreSiteImageLook => {
	const source: Record<string, unknown> = objectOf(look);
	const shape: StoreSitesEnum.ImageShape = oneOf(
		source.shape,
		Object.values(StoreSitesEnum.ImageShape),
		StoreSitesEnum.ImageShape.TEMPLATE,
	);

	return {
		shape,
		// A circle is always as tall as it is wide.
		ratio:
			shape === StoreSitesEnum.ImageShape.CIRCLE
				? StoreSitesEnum.ImageRatio.SQUARE
				: oneOf(
						source.ratio,
						Object.values(StoreSitesEnum.ImageRatio),
						StoreSitesEnum.ImageRatio.TEMPLATE,
				  ),
	};
};

/**
 * The shape and proportion of the images of a site, whatever was stored or
 * sent: by place (products, photos of the sections, images of the blocks),
 * each as the template draws it until the owner changes it.
 */
export const siteImageStyleOf = (style: unknown): IStoreSiteImageStyle => {
	const source: Record<string, unknown> = objectOf(style);

	return {
		product: lookOf(source.product),
		section: lookOf(source.section),
		block: lookOf(source.block),
	};
};
