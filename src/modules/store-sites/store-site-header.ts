import {
	IStoreSiteBlockButton,
	IStoreSiteHeader,
} from './interfaces/store-site.interface';
import StoreSitesEnum from './interfaces/store-sites.enum';
import { buttonOf } from './store-site-blocks';

const PARTS: StoreSitesEnum.HeaderPart[] = Object.values(
	StoreSitesEnum.HeaderPart,
);

export const HEADER_HEIGHT_RANGE: [number, number] = [40, 200];
export const HEADER_WIDTH_RANGE: [number, number] = [160, 480];

/** Whole pixels within a range a page can take, or nothing. */
const pixelsOf = (
	value: unknown,
	[min, max]: [number, number],
): number | null =>
	typeof value === 'number' && Number.isFinite(value)
		? Math.min(max, Math.max(min, Math.round(value)))
		: null;

/**
 * How clean the background is, 0 to 100. A header saved when this was only on
 * or off is fully clean when it was on.
 */
const transparencyOf = (source: Record<string, unknown>): number => {
	const value: unknown = source.transparency;

	if (typeof value === 'number' && Number.isFinite(value)) {
		return Math.min(100, Math.max(0, Math.round(value)));
	}

	return source.isTransparent === true ? 100 : 0;
};

/**
 * The buttons of the header one by one, in the order given: the sign-in, the
 * cart and each of the owner's own, every one once. An order kept when the
 * owner's buttons went together has them where that group was; anything else
 * is the usual order, the owner's first.
 */
export const actionsOrderOf = (
	order: unknown,
	buttonCount: number,
): string[] => {
	const own: string[] = Array.from(
		{ length: buttonCount },
		(_, index: number) => `${StoreSitesEnum.HEADER_BUTTON_PREFIX}${index}`,
	);

	const all: string[] = [
		...own,
		StoreSitesEnum.HeaderAction.SIGN_IN,
		StoreSitesEnum.HeaderAction.CART,
	];

	const given: string[] = (Array.isArray(order) ? order : []).flatMap(
		(each: unknown) =>
			each === StoreSitesEnum.HeaderAction.BUTTONS ? own : [String(each)],
	);

	const kept: string[] = [
		...new Set(given.filter((each: string) => all.includes(each))),
	];

	// What the order does not say (a button added since) goes last.
	return [...kept, ...all.filter((each: string) => !kept.includes(each))];
};

/** Where each part sits: only the parts and the sides that exist. */
const alignsOf = (
	aligns: unknown,
): Partial<Record<StoreSitesEnum.HeaderPart, StoreSitesEnum.HeaderAlign>> => {
	const source: Record<string, unknown> =
		aligns && typeof aligns === 'object' && !Array.isArray(aligns)
			? (aligns as Record<string, unknown>)
			: {};

	return PARTS.reduce(
		(
			kept: Partial<
				Record<StoreSitesEnum.HeaderPart, StoreSitesEnum.HeaderAlign>
			>,
			part: StoreSitesEnum.HeaderPart,
		) =>
			Object.values(StoreSitesEnum.HeaderAlign).includes(
				source[part] as StoreSitesEnum.HeaderAlign,
			)
				? { ...kept, [part]: source[part] as StoreSitesEnum.HeaderAlign }
				: kept,
		{},
	);
};

const hexOf = (value: unknown): string | null =>
	typeof value === 'string' && StoreSitesEnum.HEX_COLOR_REGEX.test(value)
		? value
		: null;

/** Every one of them, each once, in the order given; anything else is the usual order. */
const permutationOf = <T extends string>(order: unknown, all: T[]): T[] => {
	const given: unknown[] = Array.isArray(order) ? order : [];

	const isComplete: boolean =
		given.length === all.length && all.every((each: T) => given.includes(each));

	return isComplete ? (given as T[]) : [...all];
};

/**
 * The header of the site, whatever was stored or sent: at the top unless the
 * owner chose another side, going with the page unless the owner chose to
 * keep it on screen, its parts in the usual order and with its background
 * unless the owner chose otherwise.
 */
export const siteHeaderOf = (header: unknown): IStoreSiteHeader => {
	const source: Record<string, unknown> =
		header && typeof header === 'object' && !Array.isArray(header)
			? (header as Record<string, unknown>)
			: {};

	const buttons: IStoreSiteBlockButton[] = (
		Array.isArray(source.buttons) ? source.buttons : []
	)
		.slice(0, StoreSitesEnum.MAX_HEADER_BUTTONS)
		.map(buttonOf);

	return {
		isFixed: source.isFixed === true,
		position: Object.values(StoreSitesEnum.HeaderPosition).includes(
			source.position as StoreSitesEnum.HeaderPosition,
		)
			? (source.position as StoreSitesEnum.HeaderPosition)
			: StoreSitesEnum.HeaderPosition.TOP,
		order: permutationOf(source.order, PARTS),
		transparency: transparencyOf(source),
		color: hexOf(source.color),
		background: hexOf(source.background),
		height: pixelsOf(source.height, HEADER_HEIGHT_RANGE),
		width: pixelsOf(source.width, HEADER_WIDTH_RANGE),
		buttons,
		actionsOrder: actionsOrderOf(source.actionsOrder, buttons.length),
		buttonSize: Object.values(StoreSitesEnum.CartButtonSize).includes(
			source.buttonSize as StoreSitesEnum.CartButtonSize,
		)
			? (source.buttonSize as StoreSitesEnum.CartButtonSize)
			: StoreSitesEnum.CartButtonSize.MEDIUM,
		aligns: alignsOf(source.aligns),
	};
};
