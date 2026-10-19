import AppsEnum from '../interfaces/apps.enum';
import { buildCustomerFromMessengerChat } from './messenger.customer-factory';

describe('buildCustomerFromMessengerChat', () => {
	const chat: any = { psid: 'PSID1', name: 'Ana Souza' };

	it('makes a customer of the person, with Messenger as where they came from', () => {
		const customer: any = buildCustomerFromMessengerChat(
			'owner1',
			chat,
			'ana1',
		);

		expect(customer).toMatchObject({
			name: 'Ana Souza',
			ownerUserId: 'owner1',
			uniqName: 'ana1',
			email: null,
			phoneNumbers: [],
			externalSources: [{ appId: AppsEnum.App.FACEBOOK, externalId: 'PSID1' }],
		});
	});

	it('never sets gender, whose schema enum has no null', () => {
		expect(buildCustomerFromMessengerChat('o', chat, 'x')).not.toHaveProperty(
			'gender',
		);
	});

	it('names a person Facebook gave no name for', () => {
		const customer = buildCustomerFromMessengerChat(
			'o',
			{ psid: '99', name: null } as any,
			'x',
		);

		expect(customer.name).toBe('Messenger 99');
	});
});
