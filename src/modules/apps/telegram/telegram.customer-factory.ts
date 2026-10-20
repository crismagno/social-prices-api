import { ICustomer } from '../../customers/interfaces/customer.interface';
import { ITelegramChat } from './telegram-chat.interface';

type ChatPerson = Pick<
	ITelegramChat,
	'telegramUserId' | 'firstName' | 'lastName' | 'username'
>;

const displayName = (chat: ChatPerson): string =>
	[chat.firstName, chat.lastName].filter(Boolean).join(' ') ||
	(chat.username ? `@${chat.username}` : `Telegram ${chat.telegramUserId}`);

/**
 * The document for a customer made from a person who wrote to the bot. Telegram
 * gives no e-mail or phone, so those stay empty; `gender` is left out on purpose,
 * as its schema enum has no null.
 */
export const buildCustomerFromTelegramChat = (
	ownerUserId: string,
	chat: ChatPerson,
	uniqName: string,
): Partial<ICustomer> => {
	const now: Date = new Date();

	return {
		avatar: null,
		name: displayName(chat),
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
		externalSources: [],
		createdAt: now,
		updatedAt: now,
	};
};
