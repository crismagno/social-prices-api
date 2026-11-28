import StoreSitesEnum from './interfaces/store-sites.enum';

/** One place marked on a map: where it is and what it says. */
export interface IStoreSiteMapPin {
	key: string;
	lat: number;
	lng: number;
	/** Its name, shown over it. */
	label: string | null;
	/** A line or two shown when it is picked: an address, opening hours. */
	description: string | null;
	/** Its colour, as #rrggbb; empty, the site's main one. */
	color: string | null;
}

/** A map with the places the owner marked on it. */
export interface IStoreSiteMap {
	/** Its height, in pixels. */
	height: number;
	/** Shows every pin at once; off, the centre and the zoom below are used. */
	isAutoFit: boolean;
	centerLat: number;
	centerLng: number;
	zoom: number;
	pins: IStoreSiteMapPin[];
}

export const MAP_LIMITS = {
	height: [200, 900] as [number, number],
	defaultHeight: 420,
	zoom: [2, 18] as [number, number],
	defaultZoom: 12,
	pins: 60,
	label: 80,
	description: 300,
	/** Web maps stop short of the poles. */
	lat: 85,
} as const;

type TRecord = Record<string, unknown>;

const recordOf = (value: unknown): TRecord =>
	value && typeof value === 'object' && !Array.isArray(value)
		? (value as TRecord)
		: {};

const textOf = (value: unknown, max: number): string | null =>
	typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;

// A whole number within a range, or the fallback.
const wholeOf = (
	value: unknown,
	[min, max]: [number, number],
	fallback: number,
): number =>
	typeof value === 'number' && Number.isFinite(value)
		? Math.min(max, Math.max(min, Math.round(value)))
		: fallback;

// A coordinate within its range, to six decimals (some ten centimetres).
const degreesOf = (value: unknown, limit: number): number | null =>
	typeof value === 'number' &&
	Number.isFinite(value) &&
	Math.abs(value) <= limit
		? Math.round(value * 1e6) / 1e6
		: null;

/**
 * A map, whatever was stored or sent: a height and a zoom within their
 * ranges, and only pins that are somewhere on Earth, each with a key of its
 * own, plain words and a plain colour.
 */
export const siteMapOf = (raw: unknown): IStoreSiteMap => {
	const source: TRecord = recordOf(raw);

	const taken: Set<string> = new Set();

	const pins: IStoreSiteMapPin[] = (
		Array.isArray(source.pins) ? source.pins : []
	)
		.map(recordOf)
		.reduce((kept: IStoreSiteMapPin[], pin: TRecord) => {
			const lat: number | null = degreesOf(pin.lat, MAP_LIMITS.lat);
			const lng: number | null = degreesOf(pin.lng, 180);

			if (lat === null || lng === null || kept.length >= MAP_LIMITS.pins) {
				return kept;
			}

			const given: string = typeof pin.key === 'string' ? pin.key.trim() : '';

			const key: string =
				/^[A-Za-z0-9_-]{1,40}$/.test(given) && !taken.has(given)
					? given
					: `p${kept.length}-${taken.size}`;

			taken.add(key);

			return [
				...kept,
				{
					key,
					lat,
					lng,
					label: textOf(pin.label, MAP_LIMITS.label),
					description: textOf(pin.description, MAP_LIMITS.description),
					color:
						typeof pin.color === 'string' &&
						StoreSitesEnum.HEX_COLOR_REGEX.test(pin.color)
							? pin.color
							: null,
				},
			];
		}, []);

	return {
		height: wholeOf(source.height, MAP_LIMITS.height, MAP_LIMITS.defaultHeight),
		isAutoFit: source.isAutoFit !== false,
		centerLat: degreesOf(source.centerLat, MAP_LIMITS.lat) ?? 0,
		centerLng: degreesOf(source.centerLng, 180) ?? 0,
		zoom: wholeOf(source.zoom, MAP_LIMITS.zoom, MAP_LIMITS.defaultZoom),
		pins,
	};
};
