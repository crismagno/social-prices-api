import { ICustomer } from '../../customers/interfaces/customer.interface';
import AppsEnum from '../interfaces/apps.enum';
import { IMessengerChat } from './messenger-chat.interface';

type ChatPerson = Pick<IMessengerChat, 'psid' | 'name'>;

/**
 * The document for a customer made from a person who wrote to the Page. Facebook
 * gives no e-mail or phone, so those stay empty; `gender` is left out on
 * purpose, as its schema enum has no null.
 */
export const buildCustomerFromMessengerChat = (
	ownerUserId: string,
	chat: ChatPerson,
	uniqName: string,
): Partial<ICustomer> => {
	const now: Date = new Date();

	return {
		avatar: null,
		name: chat.name || `Messenger ${chat.psid}`,
		email: null,
		birthDate: null,
		addresses: [],
		about: null,
		idNumber: null,
		cpf: null,
		cnpj: null,
		phoneNumbers: [],
		tagsIds: [],
		ownerUserId: ownerUserId as any,
		userId: null,
		uniqName,
		uploadFilename: null,
		externalSources: [{ appId: AppsEnum.App.FACEBOOK, externalId: chat.psid }],
		createdAt: now,
		updatedAt: now,
	};
};
