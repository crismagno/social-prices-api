import { randomBytes } from 'crypto';

import {
	IStoreSiteContactBox,
	IStoreSiteContactButton,
	IStoreSiteContactField,
	IStoreSiteContactForm,
} from './interfaces/store-site.interface';
import StoreSitesEnum from './interfaces/store-sites.enum';

const Type = StoreSitesEnum.ContactFieldType;
const Destination = StoreSitesEnum.ContactDestination;

const KEY = /^[a-z0-9-]{1,40}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_LABEL = 60;
const MAX_PLACEHOLDER = 80;
const MAX_OPTION = 60;
const MAX_TITLE = 80;
const MAX_BUTTON_LABEL = 30;
const MAX_SUCCESS_MESSAGE = 200;
const MAX_EMAIL = 160;
const MAX_WEBHOOK_URL = 500;

/** The most a visitor may write in a field of each kind. */
export const CONTACT_ANSWER_MAX: Record<
	StoreSitesEnum.ContactFieldType,
	number
> = {
	[Type.NAME]: 80,
	[Type.EMAIL]: 160,
	[Type.PHONE]: 30,
	[Type.TEXT]: 200,
	[Type.TEXTAREA]: 2000,
	[Type.SELECT]: MAX_OPTION,
};

/** How a field is called where no name was given to it: an e-mail, a webhook. */
const USUAL_LABELS: Record<StoreSitesEnum.ContactFieldType, string> = {
	[Type.NAME]: 'Name',
	[Type.EMAIL]: 'E-mail',
	[Type.PHONE]: 'Phone',
	[Type.TEXT]: 'Text',
	[Type.TEXTAREA]: 'Message',
	[Type.SELECT]: 'Choice',
};

const recordOf = (value: unknown): Record<string, unknown> =>
	value && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};

const textOf = (value: unknown, max: number): string | null =>
	typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;

const field = (
	key: string,
	type: StoreSitesEnum.ContactFieldType,
	isRequired: boolean,
): IStoreSiteContactField => ({
	key,
	type,
	label: null,
	placeholder: null,
	isRequired,
	options: [],
});

/**
 * The keys of the fields every contact page had before it could be changed,
 * by what the form called each when it sent them.
 */
export const USUAL_CONTACT_KEYS = {
	name: 'contact-name',
	email: 'contact-email',
	phone: 'contact-phone',
	message: 'contact-message',
} as const;

/** The form every contact page had before it could be changed. */
const usualFields = (): IStoreSiteContactField[] => [
	field(USUAL_CONTACT_KEYS.name, Type.NAME, true),
	field(USUAL_CONTACT_KEYS.email, Type.EMAIL, true),
	field(USUAL_CONTACT_KEYS.phone, Type.PHONE, false),
	field(USUAL_CONTACT_KEYS.message, Type.TEXTAREA, true),
];

const optionsOf = (value: unknown): string[] =>
	[
		...new Set(
			(Array.isArray(value) ? value : [])
				.map((option: unknown) => textOf(option, MAX_OPTION))
				.filter((option: string | null): option is string => !!option),
		),
	].slice(0, StoreSitesEnum.MAX_CONTACT_OPTIONS);

const fieldsOf = (value: unknown): IStoreSiteContactField[] => {
	if (!Array.isArray(value)) {
		return usualFields();
	}

	const taken: Set<string> = new Set();
	const kept: IStoreSiteContactField[] = [];

	for (const raw of value) {
		const source: Record<string, unknown> = recordOf(raw);

		const type = source.type as StoreSitesEnum.ContactFieldType;

		if (!Object.values(Type).includes(type)) {
			continue;
		}

		const options: string[] =
			type === Type.SELECT ? optionsOf(source.options) : [];

		// A choice with nothing to choose from asks nothing.
		if (type === Type.SELECT && !options.length) {
			continue;
		}

		const given: string = typeof source.key === 'string' ? source.key : '';

		const key: string =
			KEY.test(given) && !taken.has(given)
				? given
				: `f-${randomBytes(4).toString('hex')}`;

		taken.add(key);

		kept.push({
			key,
			type,
			label: textOf(source.label, MAX_LABEL),
			placeholder: textOf(source.placeholder, MAX_PLACEHOLDER),
			isRequired: source.isRequired === true,
			options,
		});

		if (kept.length >= StoreSitesEnum.MAX_CONTACT_FIELDS) {
			break;
		}
	}

	// A form that asks nothing is the usual one.
	return kept.length ? kept : usualFields();
};

const colorOf = (value: unknown): string | null =>
	typeof value === 'string' && StoreSitesEnum.HEX_COLOR_REGEX.test(value.trim())
		? value.trim().toLowerCase()
		: null;

const oneOf = <T extends string>(
	value: unknown,
	options: T[],
	fallback: T,
): T => (options.includes(value as T) ? (value as T) : fallback);

/** A whole number of pixels within its limits, or nothing. */
const pixelsOf = (
	value: unknown,
	limits: { min: number; max: number },
): number | null =>
	typeof value === 'number' && Number.isFinite(value)
		? Math.min(limits.max, Math.max(limits.min, Math.round(value)))
		: null;

/** The send button, also for a form saved before it could be styled. */
const buttonOf = (value: unknown): IStoreSiteContactButton => {
	const source: Record<string, unknown> = recordOf(value);

	return {
		color: colorOf(source.color),
		textColor: colorOf(source.textColor),
		icon: Object.values(StoreSitesEnum.FeatureIcon).includes(
			source.icon as StoreSitesEnum.FeatureIcon,
		)
			? (source.icon as StoreSitesEnum.FeatureIcon)
			: null,
		iconPosition: oneOf(
			source.iconPosition,
			Object.values(StoreSitesEnum.ContactIconPosition),
			StoreSitesEnum.ContactIconPosition.START,
		),
		size: oneOf(
			source.size,
			Object.values(StoreSitesEnum.ContactButtonSize),
			StoreSitesEnum.ContactButtonSize.MEDIUM,
		),
		shape: oneOf(
			source.shape,
			Object.values(StoreSitesEnum.ContactButtonShape),
			StoreSitesEnum.ContactButtonShape.PILL,
		),
		align: oneOf(
			source.align,
			Object.values(StoreSitesEnum.ContactButtonAlign),
			StoreSitesEnum.ContactButtonAlign.START,
		),
		isFullWidth: source.isFullWidth === true,
	};
};

/** The box around the form, also for a form saved before it could be styled. */
const boxOf = (value: unknown): IStoreSiteContactBox => {
	const source: Record<string, unknown> = recordOf(value);
	const limits = StoreSitesEnum.CONTACT_BOX_LIMITS;

	return {
		width: pixelsOf(source.width, limits.width),
		padding: pixelsOf(source.padding, limits.padding),
		radius: pixelsOf(source.radius, limits.radius),
		background: colorOf(source.background),
		borderColor: colorOf(source.borderColor),
		isBorderVisible: source.isBorderVisible !== false,
		textColor: colorOf(source.textColor),
		fieldBackground: colorOf(source.fieldBackground),
		shadow: oneOf(
			source.shadow,
			Object.values(StoreSitesEnum.ContactBoxShadow),
			StoreSitesEnum.ContactBoxShadow.NONE,
		),
	};
};

/** A number for WhatsApp, with its country code: digits only, or nothing. */
const whatsappOf = (value: unknown): string | null => {
	const digits: string =
		typeof value === 'string' || typeof value === 'number'
			? String(value).replace(/\D/g, '')
			: '';

	return digits.length >= 8 && digits.length <= 15 ? digits : null;
};

const emailOf = (value: unknown): string | null => {
	const email: string | null = textOf(value, MAX_EMAIL);

	return email && EMAIL.test(email) ? email.toLowerCase() : null;
};

// Names that only mean something inside a network, never a public address.
const INNER_HOST =
	/^(localhost|.*\.localhost|.*\.local|.*\.internal|.*\.lan|.*\.home|.*\.test)$/i;

/**
 * An address a form may be sent to as data, or nothing: over https, with a
 * public name (never a bare number of a machine, nor a name of an inner
 * network), no user or password in it. Where it really leads is checked again
 * when it is called.
 */
export const safeWebhookUrl = (value: unknown): string | null => {
	const text: string | null = textOf(value, MAX_WEBHOOK_URL);

	if (!text) {
		return null;
	}

	let url: URL;

	try {
		url = new URL(text);
	} catch {
		return null;
	}

	const host: string = url.hostname;

	const isNumber: boolean =
		/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':');

	return url.protocol === 'https:' &&
		!url.username &&
		!url.password &&
		host.includes('.') &&
		!isNumber &&
		!INNER_HOST.test(host)
		? url.toString()
		: null;
};

/**
 * The form of the contact page, whatever was stored or sent. One saved
 * before it could be changed asks what it always asked (name, e-mail, phone
 * and message) and goes to the store's inbox.
 */
export const siteContactFormOf = (form: unknown): IStoreSiteContactForm => {
	const source: Record<string, unknown> = recordOf(form);

	return {
		title: textOf(source.title, MAX_TITLE),
		buttonLabel: textOf(source.buttonLabel, MAX_BUTTON_LABEL),
		successMessage: textOf(source.successMessage, MAX_SUCCESS_MESSAGE),
		fields: fieldsOf(source.fields),
		destination: Object.values(Destination).includes(
			source.destination as StoreSitesEnum.ContactDestination,
		)
			? (source.destination as StoreSitesEnum.ContactDestination)
			: Destination.INBOX,
		email: emailOf(source.email),
		whatsapp: whatsappOf(source.whatsapp),
		webhookUrl: safeWebhookUrl(source.webhookUrl),
		button: buttonOf(source.button),
		box: boxOf(source.box),
	};
};

/**
 * Where the form really goes: what the owner chose, once the address it needs
 * was given; until then, the store's inbox, so nothing a visitor writes is lost.
 */
export const contactDestinationOf = (
	form: IStoreSiteContactForm,
): StoreSitesEnum.ContactDestination => {
	const address: Partial<
		Record<StoreSitesEnum.ContactDestination, string | null>
	> = {
		[Destination.EMAIL]: form.email,
		[Destination.WHATSAPP]: form.whatsapp,
		[Destination.WEBHOOK]: form.webhookUrl,
	};

	return form.destination === Destination.INBOX || address[form.destination]
		? form.destination
		: Destination.INBOX;
};

/** The form without the addresses that are the owner's alone. */
export type TPublicContactForm = Omit<
	IStoreSiteContactForm,
	'email' | 'webhookUrl'
>;

/**
 * The form as the public site carries it: what it asks and where it goes, but
 * neither the e-mail nor the webhook, which are the owner's alone and are not
 * even named in it. The number of WhatsApp goes only when the form opens it.
 */
export const publicContactFormOf = (
	form: IStoreSiteContactForm,
): TPublicContactForm => {
	const destination: StoreSitesEnum.ContactDestination =
		contactDestinationOf(form);

	return {
		title: form.title,
		buttonLabel: form.buttonLabel,
		successMessage: form.successMessage,
		fields: form.fields,
		destination,
		whatsapp: destination === Destination.WHATSAPP ? form.whatsapp : null,
		button: form.button,
		box: form.box,
	};
};

/** One answer of a visitor, with the field it answers. */
export interface IContactAnswer {
	key: string;
	type: StoreSitesEnum.ContactFieldType;
	label: string;
	value: string;
}

/** An answer that cannot be taken: which field it is. */
export class ContactAnswerError extends Error {
	constructor(public readonly field: string) {
		super(`Invalid contact field: ${field}`);
	}
}

const isPhone = (value: string): boolean =>
	/\d{6,}/.test(value.replace(/\D/g, ''));

export const contactLabelOf = (asked: IStoreSiteContactField): string =>
	asked.label ?? USUAL_LABELS[asked.type];

/**
 * What a visitor answered, field by field as the form asks, checked: what
 * must be filled is, an e-mail and a phone look like one, a choice is one of
 * the options, and nothing is longer than its kind takes. A field left empty
 * that may be is simply not there. Anything the form does not ask is ignored.
 */
export const contactAnswersOf = (
	form: IStoreSiteContactForm,
	sent: Record<string, unknown>,
): IContactAnswer[] => {
	const answers: IContactAnswer[] = [];

	for (const asked of form.fields) {
		const raw: unknown = sent[asked.key];
		const value: string = typeof raw === 'string' ? raw.trim() : '';

		if (!value) {
			if (asked.isRequired) {
				throw new ContactAnswerError(asked.key);
			}

			continue;
		}

		const isWrong: boolean =
			value.length > CONTACT_ANSWER_MAX[asked.type] ||
			(asked.type === Type.EMAIL && !EMAIL.test(value)) ||
			(asked.type === Type.PHONE && !isPhone(value)) ||
			(asked.type === Type.SELECT && !asked.options.includes(value));

		if (isWrong) {
			throw new ContactAnswerError(asked.key);
		}

		answers.push({
			key: asked.key,
			type: asked.type,
			label: contactLabelOf(asked),
			value: asked.type === Type.EMAIL ? value.toLowerCase() : value,
		});
	}

	return answers;
};

const firstOf = (
	answers: IContactAnswer[],
	type: StoreSitesEnum.ContactFieldType,
): string | null =>
	answers.find((answer: IContactAnswer) => answer.type === type)?.value ?? null;

/** Who wrote, as far as the form asked: the first name, e-mail and phone. */
export const contactIdentityOf = (
	answers: IContactAnswer[],
): { name: string | null; email: string | null; phone: string | null } => ({
	name: firstOf(answers, Type.NAME),
	email: firstOf(answers, Type.EMAIL),
	phone: firstOf(answers, Type.PHONE),
});

const IDENTITY: StoreSitesEnum.ContactFieldType[] = [
	Type.NAME,
	Type.EMAIL,
	Type.PHONE,
];

/** Every answer on a line of its own, named. */
export const contactLinesOf = (answers: IContactAnswer[]): string[] =>
	answers.map((answer: IContactAnswer) => `${answer.label}: ${answer.value}`);

/**
 * What was written, as a message of a conversation: who wrote is on the
 * conversation already, so only the rest is said. A single thing said is said
 * plainly; several, each with its name.
 */
export const contactMessageOf = (answers: IContactAnswer[]): string => {
	const said: IContactAnswer[] = answers.filter(
		(answer: IContactAnswer) => !IDENTITY.includes(answer.type),
	);

	if (said.length === 1) {
		return said[0].value;
	}

	return contactLinesOf(said.length ? said : answers).join('\n');
};
