import {
	isRichText,
	richTextToPlain,
	sanitizeRichText,
} from '../../shared/utils/rich-text/rich-text';
import {
	ISiteChatExtraField,
	IStoreSiteChat,
	IStoreSiteChatColors,
} from './interfaces/store-site.interface';
import StoreSitesEnum from './interfaces/store-sites.enum';

const MAX_LABEL_LENGTH = 30;
const MAX_TITLE_LENGTH = 60;
const MAX_GREETING_LENGTH = 300;
const MIN_SESSION_MINUTES = 5;
const MAX_SESSION_MINUTES = 24 * 60;
const DEFAULT_SESSION_MINUTES = 60;

const minutesOf = (value: unknown): number =>
	typeof value === 'number' && Number.isFinite(value)
		? Math.min(
				MAX_SESSION_MINUTES,
				Math.max(MIN_SESSION_MINUTES, Math.round(value)),
		  )
		: DEFAULT_SESSION_MINUTES;

/** The customer fields the owner chose: known ones, each once, in order. */
const extraFieldsOf = (fields: unknown): ISiteChatExtraField[] => {
	const taken: Set<string> = new Set();

	return (Array.isArray(fields) ? fields : [])
		.map((raw: unknown): ISiteChatExtraField | null => {
			const source: Record<string, unknown> =
				raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
			const field = source.field as StoreSitesEnum.ChatCustomerField;

			if (
				!Object.values(StoreSitesEnum.ChatCustomerField).includes(field) ||
				taken.has(field)
			) {
				return null;
			}

			taken.add(field);

			return { field, isRequired: source.isRequired === true };
		})
		.filter(
			(field: ISiteChatExtraField | null): field is ISiteChatExtraField =>
				!!field,
		);
};

const FIELDS_VERSION = 2;

const Mode = StoreSitesEnum.ChatFieldMode;
const Customer = StoreSitesEnum.ChatCustomerField;

/** An older chat asked email and phone by modes; they go first in its list. */
const legacyFieldsOf = (
	source: Record<string, unknown>,
	modes: StoreSitesEnum.ChatFieldMode[],
): ISiteChatExtraField[] => {
	const email = oneOf(source.emailField, modes, Mode.REQUIRED);
	const phone = oneOf(source.phoneField, modes, Mode.OPTIONAL);
	const others = extraFieldsOf(source.extraFields).filter(
		({ field }: ISiteChatExtraField): boolean =>
			field !== Customer.EMAIL && field !== Customer.PHONE,
	);

	return [
		...(email === Mode.HIDDEN
			? []
			: [{ field: Customer.EMAIL, isRequired: email === Mode.REQUIRED }]),
		...(phone === Mode.HIDDEN
			? []
			: [{ field: Customer.PHONE, isRequired: phone === Mode.REQUIRED }]),
		...others,
	];
};

const modeIn = (
	fields: ISiteChatExtraField[],
	wanted: StoreSitesEnum.ChatCustomerField,
): StoreSitesEnum.ChatFieldMode => {
	const found = fields.find(
		({ field }: ISiteChatExtraField): boolean => field === wanted,
	);

	if (!found) {
		return Mode.HIDDEN;
	}

	return found.isRequired ? Mode.REQUIRED : Mode.OPTIONAL;
};

const textOf = (value: unknown, max: number): string | null =>
	typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;

/**
 * The first message, written in the editor or typed plain. Formatted, it is
 * cleaned and its words are what count; too long, it keeps only its words.
 */
const greetingOf = (value: unknown): string | null => {
	const clean: string | null =
		typeof value === 'string' ? sanitizeRichText(value) : null;

	if (!clean) {
		return null;
	}

	if (!isRichText(clean)) {
		return clean.slice(0, MAX_GREETING_LENGTH);
	}

	const words: string = richTextToPlain(clean);

	return words.length <= MAX_GREETING_LENGTH &&
		clean.length <= MAX_GREETING_LENGTH * 6
		? clean
		: words.slice(0, MAX_GREETING_LENGTH);
};

const oneOf = <T extends string>(
	value: unknown,
	options: T[],
	fallback: T,
): T => (options.includes(value as T) ? (value as T) : fallback);

/**
 * The chat of the site, whatever was stored or sent. Off until the owner turns
 * it on; a name is always asked, then the fields in `extraFields` (an older
 * chat's email and phone modes become the first of them).
 */
export const siteChatOf = (chat: unknown): IStoreSiteChat => {
	const source: Record<string, unknown> =
		chat && typeof chat === 'object' ? (chat as Record<string, unknown>) : {};

	const modes: StoreSitesEnum.ChatFieldMode[] = Object.values(
		StoreSitesEnum.ChatFieldMode,
	);
	const extraFields: ISiteChatExtraField[] =
		source.fieldsVersion === FIELDS_VERSION
			? extraFieldsOf(source.extraFields)
			: legacyFieldsOf(source, modes);

	return {
		isActive: source.isActive === true,
		position: oneOf(
			source.position,
			Object.values(StoreSitesEnum.ChatPosition),
			StoreSitesEnum.ChatPosition.RIGHT,
		),
		icon: oneOf(
			source.icon,
			Object.values(StoreSitesEnum.ChatIcon),
			StoreSitesEnum.ChatIcon.MESSAGE,
		),
		buttonSize: oneOf(
			source.buttonSize,
			Object.values(StoreSitesEnum.ChatSize),
			StoreSitesEnum.ChatSize.MEDIUM,
		),
		windowSize: oneOf(
			source.windowSize,
			Object.values(StoreSitesEnum.ChatSize),
			StoreSitesEnum.ChatSize.MEDIUM,
		),
		buttonAnimation: oneOf(
			source.buttonAnimation,
			Object.values(StoreSitesEnum.ChatButtonAnimation),
			StoreSitesEnum.ChatButtonAnimation.BOB,
		),
		windowAnimation: oneOf(
			source.windowAnimation,
			Object.values(StoreSitesEnum.ChatWindowAnimation),
			StoreSitesEnum.ChatWindowAnimation.POP,
		),
		buttonLabel: textOf(source.buttonLabel, MAX_LABEL_LENGTH),
		title: textOf(source.title, MAX_TITLE_LENGTH),
		greeting: greetingOf(source.greeting),
		emailField: modeIn(extraFields, Customer.EMAIL),
		phoneField: modeIn(extraFields, Customer.PHONE),
		sessionMinutes: minutesOf(source.sessionMinutes),
		extraFields,
		fieldsVersion: FIELDS_VERSION,
		colors: chatColorsOf(source.colors),
	};
};

/** The colours of the chat: only plain hex ones, the others left to the site. */
export const chatColorsOf = (colors: unknown): IStoreSiteChatColors => {
	const source: Record<string, unknown> =
		colors && typeof colors === 'object'
			? (colors as Record<string, unknown>)
			: {};

	const hex = (value: unknown): string | null =>
		typeof value === 'string' && StoreSitesEnum.HEX_COLOR_REGEX.test(value)
			? value
			: null;

	return {
		primary: hex(source.primary),
		background: hex(source.background),
		text: hex(source.text),
	};
};
