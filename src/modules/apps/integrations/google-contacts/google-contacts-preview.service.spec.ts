import AppsEnum from '../../interfaces/apps.enum';
import {
	GoogleContactsPreviewService,
	MAX_CONTACTS_LISTED,
} from './google-contacts-preview.service';

const person = (n: number, extra: any = {}): any => ({
	resourceName: `people/c${n}`,
	names: [{ displayName: `Person ${String(n).padStart(4, '0')}` }],
	emailAddresses: [{ value: `P${n}@Example.com` }],
	phoneNumbers: [{ value: `1199999${String(n).padStart(4, '0')}` }],
	...extra,
});

const page = (people: any[], next: string | null = null) => ({
	connections: people,
	nextPageToken: next,
});

const build = (pages: any[], existing: any = {}) => {
	const tokens: any = {
		forOwner: jest
			.fn()
			.mockResolvedValue({ connection: { _id: 'c1' }, accessToken: 'AT' }),
	};
	const people: any = { listConnections: jest.fn() };
	for (const p of pages) {
		people.listConnections.mockResolvedValueOnce(p);
	}
	const customers: any = {
		findExisting: jest.fn().mockResolvedValue(existing.customers ?? []),
	};

	return {
		tokens,
		people,
		customers,
		service: new GoogleContactsPreviewService(tokens, people, customers),
	};
};

describe('GoogleContactsPreviewService', () => {
	it('marks each contact new, existing (not linked yet) or already linked', async () => {
		const { service } = build([page([person(1), person(2), person(3)])], {
			customers: [
				{
					_id: 'k1',
					email: 'other@example.com',
					externalSources: [
						{ appId: AppsEnum.App.GOOGLE_CONTACTS, externalId: 'people/c1' },
					],
				},
				{ _id: 'k2', email: 'p2@example.com', externalSources: [] },
			],
		});

		const result = await service.preview('u1');

		expect(result.hasMore).toBe(false);
		expect(result.contacts.map((c) => [c.externalId, c.status])).toEqual([
			['people/c1', AppsEnum.ContactStatus.LINKED],
			['people/c2', AppsEnum.ContactStatus.EXISTING],
			['people/c3', AppsEnum.ContactStatus.NEW],
		]);
		expect(result.contacts[2]).toMatchObject({
			name: 'Person 0003',
			email: 'p3@example.com',
			phone: '11999990003',
		});
	});

	it('matches the e-mail ignoring case and sends lowercase keys to the lookup', async () => {
		const { service, customers } = build([page([person(1)])]);

		await service.preview('u1');

		expect(customers.findExisting).toHaveBeenCalledWith(
			'u1',
			AppsEnum.App.GOOGLE_CONTACTS,
			['people/c1'],
			['p1@example.com'],
		);
	});

	it('shows a contact without e-mail as new when nothing links to it', async () => {
		const { service } = build([
			page([
				{ resourceName: 'people/c9', names: [{ displayName: 'No Email' }] },
			]),
		]);

		const result = await service.preview('u1');

		expect(result.contacts[0]).toMatchObject({
			email: null,
			phone: null,
			status: AppsEnum.ContactStatus.NEW,
		});
	});

	it('skips contacts with nothing to import and Google-deleted ones', async () => {
		const { service } = build([
			page([
				{ resourceName: 'people/empty' },
				{ resourceName: 'people/gone', metadata: { deleted: true } },
				person(1),
			]),
		]);

		expect((await service.preview('u1')).contacts).toHaveLength(1);
	});

	it('sorts the rows by name', async () => {
		const { service } = build([page([person(3), person(1), person(2)])]);

		const names = (await service.preview('u1')).contacts.map((c) => c.name);

		expect(names).toEqual(['Person 0001', 'Person 0002', 'Person 0003']);
	});

	it('follows page tokens and caps the list, telling there is more', async () => {
		const big = (from: number) =>
			Array.from({ length: 1000 }, (_, i) => person(from + i));
		const { service, people } = build([
			page(big(0), 'P2'),
			page(big(1000), 'P3'),
			page(big(2000), null),
		]);

		const result = await service.preview('u1');

		expect(MAX_CONTACTS_LISTED).toBe(2000);
		expect(people.listConnections).toHaveBeenCalledTimes(2);
		expect(result.contacts).toHaveLength(2000);
		expect(result.hasMore).toBe(true);
	});

	it('trims a last page that goes over the cap', async () => {
		const big = (from: number, n: number) =>
			Array.from({ length: n }, (_, i) => person(from + i));
		const { service } = build([
			page(big(0, 1500), 'P2'),
			page(big(1500, 1500), null),
		]);

		const result = await service.preview('u1');

		expect(result.contacts).toHaveLength(2000);
		expect(result.hasMore).toBe(true);
	});
});
