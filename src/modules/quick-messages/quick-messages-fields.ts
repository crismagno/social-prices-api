import { IAddress } from '../../shared/common/address/address.interface';
import { IPhoneNumber } from '../../shared/common/phone/phone-number.interface';
import { ICustomer } from '../customers/interfaces/customer.interface';
import { IEmployee } from '../employees/interfaces/employee.interface';
import { IInboxContact } from '../inbox/interfaces/inbox.types';
import { IUser } from '../users/interfaces/user.interface';
import {
	IQuickMessageFieldInfo,
	QuickMessageFieldGroup,
} from './interfaces/quick-messages.type';

/** Who and what a quick message is sent to and by: the source of its fields. */
export interface IQuickMessageFieldSource {
	customer: ICustomer | null;
	/** What the channel says of the person, used when no customer is linked. */
	contact: IInboxContact | null;
	/** The employee who sends; null when the owner sends. */
	employee: IEmployee | null;
	user: IUser | null;
}

interface IQuickMessageField {
	key: string;
	group: QuickMessageFieldGroup;
	read: (source: IQuickMessageFieldSource) => string | null | undefined;
}

const firstPhone = (phones: IPhoneNumber[] | null | undefined): string | null =>
	phones?.[0]?.number ?? null;

const firstAddress = (source: IQuickMessageFieldSource): IAddress | null =>
	source.customer?.addresses?.[0] ?? null;

const formatDate = (date: Date | null | undefined): string | null => {
	if (!date) {
		return null;
	}

	const value: Date = new Date(date);

	if (isNaN(value.getTime())) {
		return null;
	}

	const pad = (n: number): string => String(n).padStart(2, '0');

	return `${pad(value.getUTCDate())}/${pad(
		value.getUTCMonth() + 1,
	)}/${value.getUTCFullYear()}`;
};

// The sender: the employee who clicked, or the owner when it was them.
const sender = (
	source: IQuickMessageFieldSource,
): {
	name: string | null;
	username: string | null;
	email: string | null;
	phoneNumbers: IPhoneNumber[];
} | null => source.employee ?? source.user ?? null;

/**
 * Every field a quick message may use, in one place: the replacement and the
 * editor's list both read it. Private data (passwords, ids, files) never goes in.
 */
const QUICK_MESSAGE_FIELDS: ReadonlyArray<IQuickMessageField> = [
	{
		key: 'cliente.nome',
		group: 'cliente',
		read: (s) => s.customer?.name || s.contact?.name,
	},
	{ key: 'cliente.email', group: 'cliente', read: (s) => s.customer?.email },
	{
		key: 'cliente.telefone',
		group: 'cliente',
		read: (s) => firstPhone(s.customer?.phoneNumbers),
	},
	{ key: 'cliente.cpf', group: 'cliente', read: (s) => s.customer?.cpf },
	{ key: 'cliente.cnpj', group: 'cliente', read: (s) => s.customer?.cnpj },
	{
		key: 'cliente.documento',
		group: 'cliente',
		read: (s) => s.customer?.idNumber,
	},
	{
		key: 'cliente.nascimento',
		group: 'cliente',
		read: (s) => formatDate(s.customer?.birthDate),
	},
	{ key: 'cliente.sobre', group: 'cliente', read: (s) => s.customer?.about },
	{
		key: 'cliente.endereco.rua',
		group: 'cliente',
		read: (s) => firstAddress(s)?.address1,
	},
	{
		key: 'cliente.endereco.complemento',
		group: 'cliente',
		read: (s) => firstAddress(s)?.address2,
	},
	{
		key: 'cliente.endereco.bairro',
		group: 'cliente',
		read: (s) => firstAddress(s)?.district,
	},
	{
		key: 'cliente.endereco.cidade',
		group: 'cliente',
		read: (s) => firstAddress(s)?.city,
	},
	{
		key: 'cliente.endereco.estado',
		group: 'cliente',
		read: (s) => firstAddress(s)?.state?.name,
	},
	{
		key: 'cliente.endereco.cep',
		group: 'cliente',
		read: (s) => firstAddress(s)?.zip,
	},
	{
		key: 'funcionario.nome',
		group: 'funcionario',
		read: (s) => sender(s)?.name,
	},
	{
		key: 'funcionario.usuario',
		group: 'funcionario',
		read: (s) => sender(s)?.username,
	},
	{
		key: 'funcionario.email',
		group: 'funcionario',
		read: (s) => sender(s)?.email,
	},
	{
		key: 'funcionario.telefone',
		group: 'funcionario',
		read: (s) => firstPhone(sender(s)?.phoneNumbers),
	},
];

const FIELD_PATTERN: RegExp = /\{\s*([a-z_.]+)\s*\}/gi;

/** The value of every field for this sending; a field without value is blank. */
export const buildFieldValues = (
	source: IQuickMessageFieldSource,
): Record<string, string> =>
	Object.fromEntries(
		QUICK_MESSAGE_FIELDS.map((field: IQuickMessageField) => [
			field.key,
			String(field.read(source) ?? ''),
		]),
	);

/** Fills `{group.field}` in the text. An unknown field is left as it was written. */
export const renderTemplate = (
	text: string,
	values: Record<string, string>,
): string =>
	(text ?? '').replace(FIELD_PATTERN, (whole: string, key: string) =>
		Object.prototype.hasOwnProperty.call(values, key) ? values[key] : whole,
	);

export const listFieldInfo = (): IQuickMessageFieldInfo[] =>
	QUICK_MESSAGE_FIELDS.map((field: IQuickMessageField) => ({
		key: field.key,
		group: field.group,
		labelKey: `quickMessages.fields.${field.key.replace(/\./g, '_')}`,
	}));
