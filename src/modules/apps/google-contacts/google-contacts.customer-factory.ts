import { ICustomer } from '../../customers/interfaces/customer.interface';
import AppsEnum from '../interfaces/apps.enum';
import { IMappedContact } from './google-contacts.mapper';

/**
 * Builds the document for a customer created from an external contact.
 * `gender` is left out on purpose: its schema enum has no null, only a value or
 * no key at all.
 */
export const buildCustomerFromContact = (
	ownerUserId: string,
	appId: AppsEnum.App,
	contact: IMappedContact,
	uniqName: string,
): Partial<ICustomer> => {
	const now: Date = new Date();

	return {
		avatar: null,
		name: contact.name,
		email: contact.email,
		birthDate: contact.birthDate,
		addresses: [],
		about: contact.about,
		idNumber: null,
		cpf: null,
		cnpj: null,
		phoneNumbers: contact.phoneNumbers,
		tagsIds: [],
		ownerUserId: ownerUserId as any,
		userId: null,
		uniqName,
		uploadFilename: null,
		externalSources: [{ appId, externalId: contact.externalId }],
		createdAt: now,
		updatedAt: now,
	};
};
