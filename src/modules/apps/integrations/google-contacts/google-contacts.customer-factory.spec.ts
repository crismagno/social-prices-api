import mongoose from 'mongoose';

import { CustomerSchema } from '../../../customers/interfaces/customer.schema';
import AppsEnum from '../../interfaces/apps.enum';
import { buildCustomerFromContact } from './google-contacts.customer-factory';
import { IMappedContact } from './google-contacts.mapper';

// The real Customer schema, without a database: validateSync is what failed in
// production ("gender: null is not supported") while mocks stayed green.
const CustomerModel = mongoose.model('CustomerFactoryTest', CustomerSchema);

const contact = (over: Partial<IMappedContact> = {}): IMappedContact => ({
	externalId: 'people/c1',
	name: 'Ana Souza',
	email: 'ana@example.com',
	phoneNumbers: [
		{
			uid: 'p1',
			type: 'MOBILE',
			number: '(11) 99999-0000',
			messengers: [],
		} as any,
	],
	birthDate: new Date('1990-04-07'),
	about: 'bio',
	...over,
});

const OWNER = '507f1f77bcf86cd799439011';

describe('buildCustomerFromContact', () => {
	it('produces a document the Customer schema accepts', () => {
		const doc = new CustomerModel(
			buildCustomerFromContact(
				OWNER,
				AppsEnum.App.GOOGLE_CONTACTS,
				contact(),
				'ana-souza',
			),
		);

		expect(doc.validateSync()).toBeUndefined();
	});

	it('is still valid for a contact with only a name', () => {
		const doc = new CustomerModel(
			buildCustomerFromContact(
				OWNER,
				AppsEnum.App.GOOGLE_CONTACTS,
				contact({
					email: null,
					phoneNumbers: [],
					birthDate: null,
					about: null,
				}),
				'ana-souza',
			),
		);

		expect(doc.validateSync()).toBeUndefined();
	});

	it('links the customer to the external contact', () => {
		const built = buildCustomerFromContact(
			OWNER,
			AppsEnum.App.GOOGLE_CONTACTS,
			contact(),
			'ana-souza',
		);

		expect(built).toMatchObject({
			ownerUserId: OWNER,
			name: 'Ana Souza',
			uniqName: 'ana-souza',
			externalSources: [
				{ appId: AppsEnum.App.GOOGLE_CONTACTS, externalId: 'people/c1' },
			],
		});
	});
});
