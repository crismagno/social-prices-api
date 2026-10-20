import { ICustomer } from '../../customers/interfaces/customer.interface';
import AppsEnum from '../interfaces/apps.enum';
import { IInstagramChat } from './instagram-chat.interface';

type ChatPerson = Pick<IInstagramChat, 'igsid' | 'name' | 'username'>;

/**
 * The document for a customer made from a person who wrote to the account.
 * Instagram gives no e-mail or phone, so those stay empty; `gender` is left out
 * on purpose, as its schema enum has no null.
 */
export const buildCustomerFromInstagramChat = (
	ownerUserId: string,
	chat: ChatPerson,
	uniqName: string,
): Partial<ICustomer> => {
	const now: Date = new Date();

	return {
		avatar: null,
		name:
			chat.name ||
			(chat.username ? `@${chat.username}` : `Instagram ${chat.igsid}`),
		email: null,
		birthDate: null,
		addresses: [],
		about: chat.username ? `@${chat.username}` : null,
		idNumber: null,
		cpf: null,
		cnpj: null,
		phoneNumbers: [],
		tagsIds: [],
		ownerUserId: ownerUserId as any,
		userId: null,
		uniqName,
		uploadFilename: null,
		externalSources: [
			{ appId: AppsEnum.App.INSTAGRAM, externalId: chat.igsid },
		],
		createdAt: now,
		updatedAt: now,
	};
};
