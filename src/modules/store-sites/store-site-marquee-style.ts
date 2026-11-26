import { IStoreSiteMarqueeStyle } from './interfaces/store-site.interface';
import StoreSitesEnum from './interfaces/store-sites.enum';

const MAX_SEPARATOR_LENGTH = 3;

const oneOf = <T extends string>(
	value: unknown,
	options: T[],
	fallback: T,
): T => (options.includes(value as T) ? (value as T) : fallback);

/** A colour that is a plain hex, or nothing: it goes into the page's CSS. */
const hexOf = (value: unknown): string | null =>
	typeof value === 'string' && StoreSitesEnum.HEX_COLOR_REGEX.test(value)
		? value
		: null;

/**
 * The look of the strip of phrases, whatever was stored or sent: as the
 * template draws it unless the owner chose otherwise.
 */
export const siteMarqueeStyleOf = (style: unknown): IStoreSiteMarqueeStyle => {
	const source: Record<string, unknown> =
		style && typeof style === 'object' && !Array.isArray(style)
			? (style as Record<string, unknown>)
			: {};

	return {
		speed: oneOf(
			source.speed,
			Object.values(StoreSitesEnum.MarqueeSpeed),
			StoreSitesEnum.MarqueeSpeed.NORMAL,
		),
		direction: oneOf(
			source.direction,
			Object.values(StoreSitesEnum.MarqueeDirection),
			StoreSitesEnum.MarqueeDirection.LEFT,
		),
		separator:
			typeof source.separator === 'string' && source.separator.trim()
				? [...source.separator.trim()].slice(0, MAX_SEPARATOR_LENGTH).join('')
				: null,
		size: oneOf(
			source.size,
			Object.values(StoreSitesEnum.MarqueeSize),
			StoreSitesEnum.MarqueeSize.MEDIUM,
		),
		background: hexOf(source.background),
		color: hexOf(source.color),
		pauseOnHover: source.pauseOnHover === true,
	};
};
