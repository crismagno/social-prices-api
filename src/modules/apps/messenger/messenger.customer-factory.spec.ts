import { buildCustomerFromMessengerChat } from './messenger.customer-factory';

describe('buildCustomerFromMessengerChat', () => {
	const chat: any = { psid: 'PSID1', name: 'Ana Souza' };

	it('makes a customer of the person; the tie to them lives on the chat', () => {
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
			externalSources: [],
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
