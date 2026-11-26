import {
	ISiteChatExtraField,
	IStoreSiteChat,
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
		buttonLabel: textOf(source.buttonLabel, MAX_LABEL_LENGTH),
		title: textOf(source.title, MAX_TITLE_LENGTH),
		greeting: textOf(source.greeting, MAX_GREETING_LENGTH),
		emailField: modeIn(extraFields, Customer.EMAIL),
		phoneField: modeIn(extraFields, Customer.PHONE),
		sessionMinutes: minutesOf(source.sessionMinutes),
		extraFields,
		fieldsVersion: FIELDS_VERSION,
	};
};
