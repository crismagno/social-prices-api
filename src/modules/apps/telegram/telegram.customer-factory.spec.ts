import mongoose from 'mongoose';

import { CustomerSchema } from '../../customers/interfaces/customer.schema';
import AppsEnum from '../interfaces/apps.enum';
import { buildCustomerFromTelegramChat } from './telegram.customer-factory';

// The real Customer schema, without a database: validateSync is what caught a
// mismatch in production for Google while mocks stayed green.
const CustomerModel = mongoose.model('TelegramFactoryTest', CustomerSchema);

const OWNER = '507f1f77bcf86cd799439011';

const chat = (over: any = {}): any => ({
	telegramUserId: 777,
	firstName: 'Ana',
	lastName: 'Souza',
	username: 'ana_s',
	...over,
});

describe('buildCustomerFromTelegramChat', () => {
	it('produces a document the Customer schema accepts', () => {
		const doc = new CustomerModel(
			buildCustomerFromTelegramChat(OWNER, chat(), 'ana-souza'),
		);

		expect(doc.validateSync()).toBeUndefined();
	});

	it('is still valid for a person with only a first name', () => {
		const doc = new CustomerModel(
			buildCustomerFromTelegramChat(
				OWNER,
				chat({ lastName: null, username: null }),
				'ana',
			),
		);

		expect(doc.validateSync()).toBeUndefined();
	});

	it('names the customer after the person, then the @username, then the id', () => {
		const name = (over: any) =>
			buildCustomerFromTelegramChat(OWNER, chat(over), 'x').name;

		expect(name({})).toBe('Ana Souza');
		expect(name({ lastName: null })).toBe('Ana');
		expect(name({ firstName: null, lastName: null })).toBe('@ana_s');
		expect(name({ firstName: null, lastName: null, username: null })).toBe(
			'Telegram 777',
		);
	});

	it('links the customer to the Telegram person and keeps the @username in about', () => {
		const built = buildCustomerFromTelegramChat(OWNER, chat(), 'ana-souza');

		expect(built).toMatchObject({
			ownerUserId: OWNER,
			uniqName: 'ana-souza',
			email: null,
			about: '@ana_s',
			externalSources: [{ appId: AppsEnum.App.TELEGRAM, externalId: '777' }],
		});
	});
});
