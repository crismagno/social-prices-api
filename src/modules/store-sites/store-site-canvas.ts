import {
	IStoreSiteAboutMedia,
	IStoreSiteBlockButton,
} from './interfaces/store-site.interface';
import StoreSitesEnum from './interfaces/store-sites.enum';
import { IStoreSiteMap, siteMapOf } from './store-site-map';
import {
	richTextToPlain,
	sanitizeRichText,
} from '../../shared/utils/rich-text/rich-text';

/**
 * One thing placed on a free canvas: where it is, how big, and how it looks.
 * Its place and its size are in pixels of a canvas 1200 wide; the site scales
 * them to whatever width the screen has.
 */
export interface IStoreSiteCanvasElement {
	key: string;
	type: StoreSitesEnum.CanvasElementType;
	x: number;
	y: number;
	width: number;
	height: number;
	/** The words of a text, of a button, or written inside a box. */
	text: string | null;
	fontSize: number;
	isBold: boolean;
	align: StoreSitesEnum.CanvasAlign;
	/** The colour of its words, or of a divider's line; as #rrggbb. */
	color: string | null;
	background: string | null;
	/** How round its corners are, in pixels. */
	radius: number;
	/** How solid it is, in percent. */
	opacity: number;
	borderWidth: number;
	borderColor: string | null;
	/** The file of an image. */
	imageUrl: string | null;
	/** A video: uploaded, or a YouTube/Vimeo player. */
	media: IStoreSiteAboutMedia | null;
	/** Where a button leads. */
	button: IStoreSiteBlockButton | null;
	/** The places of a map, and how it opens. */
	map: IStoreSiteMap | null;
}

/** A free canvas: its height and what was placed on it, back to front. */
export interface IStoreSiteCanvas {
	height: number;
	elements: IStoreSiteCanvasElement[];
}

export const CANVAS_LIMITS = {
	/** The width every place and size is measured against. */
	width: 1200,
	height: [80, 4000] as [number, number],
	defaultHeight: 480,
	elements: 60,
	text: 8000,
	fontSize: [8, 240] as [number, number],
	radius: 600,
	border: 40,
	imageKey: 400,
} as const;

type TRecord = Record<string, unknown>;

const recordOf = (value: unknown): TRecord =>
	value && typeof value === 'object' && !Array.isArray(value)
		? (value as TRecord)
		: {};

const hexOf = (value: unknown): string | null =>
	typeof value === 'string' && StoreSitesEnum.HEX_COLOR_REGEX.test(value)
		? value
		: null;

const numberOf = (
	value: unknown,
	[min, max]: [number, number],
	fallback: number,
): number =>
	typeof value === 'number' && Number.isFinite(value)
		? Math.min(max, Math.max(min, Math.round(value)))
		: fallback;

/** What the canvas borrows from the blocks: their own checks, not copies. */
export interface ICanvasChecks {
	buttonOf: (button: unknown) => IStoreSiteBlockButton;
	mediaOf: (media: unknown) => IStoreSiteAboutMedia | null;
}

const Type = StoreSitesEnum.CanvasElementType;

/**
 * A canvas, whatever was stored or sent: its height within what a page can
 * take, and only elements of a known kind, each with a key of its own, inside
 * the canvas, with plain colours and numbers within their ranges.
 */
export const siteCanvasOf = (
	raw: unknown,
	{ buttonOf, mediaOf }: ICanvasChecks,
): IStoreSiteCanvas => {
	const source: TRecord = recordOf(raw);

	const height: number = numberOf(
		source.height,
		CANVAS_LIMITS.height,
		CANVAS_LIMITS.defaultHeight,
	);

	const taken: Set<string> = new Set();

	const elements: IStoreSiteCanvasElement[] = (
		Array.isArray(source.elements) ? source.elements : []
	)
		.map(recordOf)
		.filter((element: TRecord) =>
			Object.values(Type).includes(
				element.type as StoreSitesEnum.CanvasElementType,
			),
		)
		.slice(0, CANVAS_LIMITS.elements)
		.map((element: TRecord, index: number): IStoreSiteCanvasElement => {
			const type = element.type as StoreSitesEnum.CanvasElementType;

			const given: string =
				typeof element.key === 'string' ? element.key.trim() : '';

			// A key of its own: the one given when it is good and not taken.
			const key: string =
				/^[A-Za-z0-9_-]{1,40}$/.test(given) && !taken.has(given)
					? given
					: `e${index}-${taken.size}`;

			taken.add(key);

			const width: number = numberOf(
				element.width,
				[8, CANVAS_LIMITS.width],
				200,
			);
			const elementHeight: number = numberOf(element.height, [2, height], 80);

			return {
				key,
				type,
				// Never out of the canvas: at least a part of it stays in reach.
				x: numberOf(element.x, [0, CANVAS_LIMITS.width - width], 0),
				y: numberOf(element.y, [0, height - elementHeight], 0),
				width,
				height: elementHeight,
				// Words of the editor are cleaned to what they may hold; a button
				// says its words plain.
				text:
					typeof element.text === 'string' && element.text.trim()
						? type === Type.BUTTON
							? richTextToPlain(element.text).trim().slice(0, 200) || null
							: sanitizeRichText(element.text.slice(0, CANVAS_LIMITS.text))
						: null,
				fontSize: numberOf(element.fontSize, CANVAS_LIMITS.fontSize, 24),
				isBold: element.isBold === true,
				align: Object.values(StoreSitesEnum.CanvasAlign).includes(
					element.align as StoreSitesEnum.CanvasAlign,
				)
					? (element.align as StoreSitesEnum.CanvasAlign)
					: StoreSitesEnum.CanvasAlign.LEFT,
				color: hexOf(element.color),
				background: hexOf(element.background),
				radius: numberOf(element.radius, [0, CANVAS_LIMITS.radius], 0),
				opacity: numberOf(element.opacity, [0, 100], 100),
				borderWidth: numberOf(
					element.borderWidth,
					[0, CANVAS_LIMITS.border],
					0,
				),
				borderColor: hexOf(element.borderColor),
				imageUrl:
					type === Type.IMAGE &&
					typeof element.imageUrl === 'string' &&
					element.imageUrl.trim()
						? element.imageUrl.trim().slice(0, CANVAS_LIMITS.imageKey)
						: null,
				media: type === Type.VIDEO ? mediaOf(element.media) : null,
				button: type === Type.BUTTON ? buttonOf(element.button) : null,
				map: type === Type.MAP ? siteMapOf(element.map) : null,
			};
		});

	return { height, elements };
};
