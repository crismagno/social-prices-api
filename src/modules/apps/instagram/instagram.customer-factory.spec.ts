import AppsEnum from '../interfaces/apps.enum';
import { buildCustomerFromInstagramChat } from './instagram.customer-factory';

describe('buildCustomerFromInstagramChat', () => {
	const chat: any = { igsid: 'IGSID1', name: 'Ana Souza', username: 'ana_s' };

	it('makes a customer of the person, with Instagram as where they came from', () => {
		const customer: any = buildCustomerFromInstagramChat(
			'owner1',
			chat,
			'ana1',
		);

		expect(customer).toMatchObject({
			name: 'Ana Souza',
			about: '@ana_s',
			ownerUserId: 'owner1',
			uniqName: 'ana1',
			email: null,
			phoneNumbers: [],
			externalSources: [
				{ appId: AppsEnum.App.INSTAGRAM, externalId: 'IGSID1' },
			],
		});
	});

	it('never sets gender, whose schema enum has no null', () => {
		expect(buildCustomerFromInstagramChat('o', chat, 'x')).not.toHaveProperty(
			'gender',
		);
	});

	it('names a person Instagram gave no name for after their @username, or by their id', () => {
		const byUsername = buildCustomerFromInstagramChat(
			'o',
			{ igsid: '99', name: null, username: 'ana_s' } as any,
			'x',
		);
		const byId = buildCustomerFromInstagramChat(
			'o',
			{ igsid: '99', name: null, username: null } as any,
			'x',
		);

		expect(byUsername.name).toBe('@ana_s');
		expect(byId.name).toBe('Instagram 99');
	});
});
