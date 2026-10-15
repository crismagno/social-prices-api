import { randomUUID } from 'crypto';

import PhoneNumberEnum from '../../../../shared/common/phone/phone-number.enum';
import { IPhoneNumber } from '../../../../shared/common/phone/phone-number.interface';
import { IGooglePerson } from './google-contacts.types';

export interface IMappedContact {
	externalId: string;
	name: string;
	email: string | null;
	phoneNumbers: IPhoneNumber[];
	birthDate: Date | null;
	about: string | null;
}

const PHONE_TYPES: Record<string, PhoneNumberEnum.Type> = {
	mobile: PhoneNumberEnum.Type.MOBILE,
	workMobile: PhoneNumberEnum.Type.MOBILE,
	home: PhoneNumberEnum.Type.HOME,
	work: PhoneNumberEnum.Type.BUSINESS,
	main: PhoneNumberEnum.Type.BUSINESS,
};

export const phoneDigits = (value: string): string =>
	String(value ?? '').replace(/\D/g, '');

const pickPrimary = <T extends { metadata?: { primary?: boolean } }>(
	items?: T[],
): T | undefined =>
	items?.find((item: T) => item.metadata?.primary) ?? items?.[0];

const mapPhones = (person: IGooglePerson): IPhoneNumber[] => {
	const seen: Set<string> = new Set();
	const phones: IPhoneNumber[] = [];

	for (const phone of person.phoneNumbers ?? []) {
		const number: string = (phone.value ?? '').trim();
		const digits: string = phoneDigits(number);

		if (!digits || seen.has(digits)) {
			continue;
		}

		seen.add(digits);

		phones.push({
			uid: randomUUID(),
			type: PHONE_TYPES[phone.type ?? ''] ?? PhoneNumberEnum.Type.OTHER,
			number,
			messengers: [],
		});
	}

	return phones;
};

const mapBirthDate = (person: IGooglePerson): Date | null => {
	const date = pickPrimary(person.birthdays)?.date;

	// A birthday without a year cannot be stored as a real date of birth.
	if (!date?.year || !date.month || !date.day) {
		return null;
	}

	return new Date(Date.UTC(date.year, date.month - 1, date.day));
};

export const mapGooglePersonToContact = (
	person: IGooglePerson,
): IMappedContact | null => {
	if (person.metadata?.deleted) {
		return null;
	}

	const email: string | null =
		pickPrimary(person.emailAddresses)?.value?.trim().toLowerCase() || null;
	const phoneNumbers: IPhoneNumber[] = mapPhones(person);
	const displayName: string | undefined = pickPrimary(
		person.names,
	)?.displayName?.trim();

	const name: string | undefined =
		displayName || email || phoneNumbers[0]?.number;

	if (!name) {
		return null;
	}

	return {
		externalId: person.resourceName,
		name,
		email,
		phoneNumbers,
		birthDate: mapBirthDate(person),
		about: pickPrimary(person.biographies)?.value?.trim() || null,
	};
};
