import { IStoreSiteBackdrop } from './interfaces/store-site.interface';
import StoreSitesEnum from './interfaces/store-sites.enum';

const MAX_FILE_KEY_LENGTH = 600;

const oneOf = <T extends string>(
	value: unknown,
	options: T[],
	fallback: T,
): T => (options.includes(value as T) ? (value as T) : fallback);

/** The key of an uploaded file, or nothing. */
const fileKeyOf = (value: unknown): string | null => {
	const key: string = typeof value === 'string' ? value.trim() : '';

	return key && key.length <= MAX_FILE_KEY_LENGTH ? key : null;
};

const numberOf = (
	value: unknown,
	[min, max]: [number, number],
	fallback: number,
): number =>
	typeof value === 'number' && Number.isFinite(value)
		? Math.min(max, Math.max(min, Math.round(value)))
		: fallback;

/**
 * What lies behind a site, whatever was stored or sent: its colour, as
 * always, unless the owner chose images or a video. Images are kept in order,
 * each once; a kind chosen with nothing to show is still that kind, and the
 * site shows its colour until something is sent.
 */
export const siteBackdropOf = (backdrop: unknown): IStoreSiteBackdrop => {
	const source: Record<string, unknown> =
		backdrop && typeof backdrop === 'object' && !Array.isArray(backdrop)
			? (backdrop as Record<string, unknown>)
			: {};

	const imageUrls: string[] = [
		...new Set(
			(Array.isArray(source.imageUrls) ? source.imageUrls : [])
				.map(fileKeyOf)
				.filter((key: string | null): key is string => !!key),
		),
	].slice(0, StoreSitesEnum.MAX_BACKDROP_IMAGES);

	return {
		type: oneOf(
			source.type,
			Object.values(StoreSitesEnum.BackdropType),
			StoreSitesEnum.BackdropType.COLOR,
		),
		imageUrls,
		slideSeconds: numberOf(
			source.slideSeconds,
			[StoreSitesEnum.MIN_SLIDE_SECONDS, StoreSitesEnum.MAX_SLIDE_SECONDS],
			StoreSitesEnum.DEFAULT_SLIDE_SECONDS,
		),
		videoUrl: fileKeyOf(source.videoUrl),
		posterUrl: fileKeyOf(source.posterUrl),
		veil: numberOf(
			source.veil,
			StoreSitesEnum.BACKDROP_VEIL_RANGE,
			StoreSitesEnum.DEFAULT_BACKDROP_VEIL,
		),
		blur: oneOf(
			source.blur,
			Object.values(StoreSitesEnum.BackdropBlur),
			StoreSitesEnum.BackdropBlur.NONE,
		),
		isAnimated: source.isAnimated !== false,
	};
};

/**
 * What lies behind one page alone: none unless the owner gave the page its
 * own, and then checked as the site's is.
 */
export const pageBackdropOf = (backdrop: unknown): IStoreSiteBackdrop | null =>
	backdrop && typeof backdrop === 'object' && !Array.isArray(backdrop)
		? siteBackdropOf(backdrop)
		: null;
