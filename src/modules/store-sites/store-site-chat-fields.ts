import PersonEnum from '../../shared/common/person/person.enum';
import StoreSitesEnum from './interfaces/store-sites.enum';

const F = StoreSitesEnum.ChatCustomerField;

const digitsOf = (value: string): string => value.replace(/\D/g, '');

const GENDER_NAMES: Record<PersonEnum.Gender, string> = {
	[PersonEnum.Gender.FEMALE]: 'Feminino',
	[PersonEnum.Gender.MALE]: 'Masculino',
	[PersonEnum.Gender.OTHER]: 'Outro',
};

/** How one field of the customer record is asked, checked and read. */
interface IChatFieldRule {
	/** Its name, as the store reads it in the inbox. */
	label: string;
	maxLength: number;
	isValid: (value: string) => boolean;
	/** The answer as the store reads it. */
	shown?: (value: string) => string;
}

const isPastDate = (value: string): boolean => {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return false;
	}

	const date: Date = new Date(`${value}T00:00:00Z`);

	return (
		!Number.isNaN(date.getTime()) &&
		date.toISOString().slice(0, 10) === value &&
		date.getTime() <= Date.now()
	);
};

const anyText = (): boolean => true;

/** The fields of a customer a site's chat can ask, each with its own rule. */
/** Email and phone are checked on their own, so they have no rule here. */
export const CHAT_FIELD_RULES: Partial<
	Record<StoreSitesEnum.ChatCustomerField, IChatFieldRule>
> = {
	[F.BIRTH_DATE]: {
		label: 'Data de nascimento',
		maxLength: 10,
		isValid: isPastDate,
		shown: (value: string) => value.split('-').reverse().join('/'),
	},
	[F.GENDER]: {
		label: 'Gênero',
		maxLength: 10,
		isValid: (value: string) =>
			Object.values(PersonEnum.Gender).includes(value as PersonEnum.Gender),
		shown: (value: string) => GENDER_NAMES[value as PersonEnum.Gender] ?? value,
	},
	[F.CPF]: {
		label: 'CPF',
		maxLength: 20,
		isValid: (value: string) => digitsOf(value).length === 11,
	},
	[F.ID_NUMBER]: { label: 'Documento', maxLength: 30, isValid: anyText },
	[F.ADDRESS]: { label: 'Endereço', maxLength: 160, isValid: anyText },
};
