import PhoneNumberEnum from '../../../../shared/common/phone/phone-number.enum';
import { mapGooglePersonToContact } from './google-contacts.mapper';

describe('mapGooglePersonToContact', () => {
	it('maps a full contact', () => {
		const contact = mapGooglePersonToContact({
			resourceName: 'people/c1',
			names: [{ displayName: 'Ana Souza', metadata: { primary: true } }],
			emailAddresses: [{ value: 'Ana@Example.COM' }],
			phoneNumbers: [
				{ value: '(11) 99999-0000', type: 'mobile' },
				{ value: '+55 11 3333-4444', type: 'work' },
			],
			birthdays: [{ date: { year: 1990, month: 4, day: 7 } }],
			biographies: [{ value: 'Friend from college' }],
		});

		expect(contact).toMatchObject({
			externalId: 'people/c1',
			name: 'Ana Souza',
			email: 'ana@example.com',
			birthDate: new Date(Date.UTC(1990, 3, 7)),
			about: 'Friend from college',
		});
		expect(contact.phoneNumbers).toHaveLength(2);
		expect(contact.phoneNumbers[0]).toMatchObject({
			number: '(11) 99999-0000',
			type: PhoneNumberEnum.Type.MOBILE,
			messengers: [],
		});
		expect(contact.phoneNumbers[1].type).toBe(PhoneNumberEnum.Type.BUSINESS);
		expect(contact.phoneNumbers[0].uid).toBeTruthy();
	});

	it('prefers the primary name over the first one', () => {
		const contact = mapGooglePersonToContact({
			resourceName: 'people/c2',
			names: [
				{ displayName: 'Other' },
				{ displayName: 'Primary', metadata: { primary: true } },
			],
		});

		expect(contact.name).toBe('Primary');
	});

	it('falls back to the e-mail, then the phone, when there is no name', () => {
		expect(
			mapGooglePersonToContact({
				resourceName: 'people/c3',
				emailAddresses: [{ value: 'x@y.com' }],
			}).name,
		).toBe('x@y.com');

		expect(
			mapGooglePersonToContact({
				resourceName: 'people/c4',
				phoneNumbers: [{ value: '11999990000' }],
			}).name,
		).toBe('11999990000');
	});

	it('skips contacts with no name, e-mail or phone', () => {
		expect(
			mapGooglePersonToContact({
				resourceName: 'people/c5',
				biographies: [{ value: 'only a note' }],
			}),
		).toBeNull();
	});

	it('skips contacts deleted at Google (incremental sync tombstones)', () => {
		expect(
			mapGooglePersonToContact({
				resourceName: 'people/c6',
				metadata: { deleted: true },
			}),
		).toBeNull();
	});

	it('ignores a birthday without a year', () => {
		const contact = mapGooglePersonToContact({
			resourceName: 'people/c7',
			names: [{ displayName: 'No Year' }],
			birthdays: [{ date: { month: 4, day: 7 } }],
		});

		expect(contact.birthDate).toBeNull();
	});

	it('drops blank phones and phones that repeat after formatting', () => {
		const contact = mapGooglePersonToContact({
			resourceName: 'people/c8',
			names: [{ displayName: 'Dup' }],
			phoneNumbers: [
				{ value: '  ' },
				{ value: '(11) 99999-0000' },
				{ value: '11999990000' },
			],
		});

		expect(contact.phoneNumbers).toHaveLength(1);
	});

	it('maps unknown phone types to OTHER', () => {
		const contact = mapGooglePersonToContact({
			resourceName: 'people/c9',
			names: [{ displayName: 'Pager' }],
			phoneNumbers: [{ value: '1234', type: 'pager' }],
		});

		expect(contact.phoneNumbers[0].type).toBe(PhoneNumberEnum.Type.OTHER);
	});
});
