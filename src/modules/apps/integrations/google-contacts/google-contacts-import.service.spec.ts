import { FeatureLimitReachedException } from '../../../feature-limits/feature-limit-reached.exception';
import FeatureLimitsEnum from '../../../feature-limits/interfaces/feature-limits.enum';
import AppsEnum from '../../interfaces/apps.enum';
import { GoogleContactsImportService } from './google-contacts-import.service';

const person = (n: number, extra: any = {}): any => ({
	resourceName: `people/c${n}`,
	names: [{ displayName: `Person ${n}` }],
	emailAddresses: [{ value: `p${n}@example.com` }],
	...extra,
});

const build = (
	over: { people?: any[]; existing?: any; create?: jest.Mock } = {},
) => {
	const tokens: any = {
		forOwner: jest
			.fn()
			.mockResolvedValue({ connection: { _id: 'conn1' }, accessToken: 'AT' }),
	};
	const peopleClient: any = {
		getByResourceNames: jest.fn().mockResolvedValue(over.people ?? []),
	};
	const customers: any = {
		findExisting: jest.fn().mockResolvedValue(over.existing ?? []),
		create: over.create ?? jest.fn().mockResolvedValue({ _id: 'new' }),
		linkExternalSource: jest.fn().mockResolvedValue(true),
	};
	const featureLimits: any = {
		assertCanCreate: jest.fn().mockResolvedValue(undefined),
	};
	const connections: any = {
		saveSyncResult: jest.fn().mockResolvedValue(undefined),
	};

	return {
		tokens,
		peopleClient,
		customers,
		featureLimits,
		connections,
		service: new GoogleContactsImportService(
			tokens,
			peopleClient,
			customers,
			featureLimits,
			connections,
		),
	};
};

describe('GoogleContactsImportService', () => {
	it('re-reads the chosen contacts from Google and creates the new ones', async () => {
		const { service, peopleClient, customers, connections } = build({
			people: [person(1), person(2)],
		});

		const result = await service.importSelected('u1', [
			'people/c1',
			'people/c2',
		]);

		expect(peopleClient.getByResourceNames).toHaveBeenCalledWith('AT', [
			'people/c1',
			'people/c2',
		]);
		expect(customers.create).toHaveBeenCalledTimes(2);
		expect(result).toMatchObject({
			created: 2,
			skipped: 0,
			failed: 0,
			limitReached: false,
		});
		expect(connections.saveSyncResult).toHaveBeenCalledWith(
			'conn1',
			expect.objectContaining({ created: 2 }),
		);
	});

	it('only links an existing customer matched by e-mail, never creates or edits it', async () => {
		const { service, customers } = build({
			people: [person(2)],
			existing: [{ _id: 'k2', email: 'p2@example.com', externalSources: [] }],
		});

		const result = await service.importSelected('u1', ['people/c2']);

		expect(customers.create).not.toHaveBeenCalled();
		expect(customers.linkExternalSource).toHaveBeenCalledWith(
			'k2',
			AppsEnum.App.GOOGLE_CONTACTS,
			'people/c2',
		);
		expect(result).toMatchObject({ created: 0, linked: 1, skipped: 0 });
	});

	it('leaves a customer that already has this app as a source completely alone', async () => {
		const { service, customers } = build({
			people: [person(1), person(3)],
			existing: [
				{
					_id: 'k1',
					email: 'x@example.com',
					externalSources: [
						{ appId: AppsEnum.App.GOOGLE_CONTACTS, externalId: 'people/c1' },
					],
				},
				{
					_id: 'k3',
					email: 'p3@example.com',
					externalSources: [
						{ appId: AppsEnum.App.GOOGLE_CONTACTS, externalId: 'people/OTHER' },
					],
				},
			],
		});

		const result = await service.importSelected('u1', [
			'people/c1',
			'people/c3',
		]);

		expect(customers.create).not.toHaveBeenCalled();
		expect(customers.linkExternalSource).not.toHaveBeenCalled();
		expect(result).toMatchObject({ created: 0, linked: 0, skipped: 2 });
	});

	it('is idempotent: importing the same selection again changes nothing', async () => {
		const { service, customers } = build({
			people: [person(1)],
			existing: [
				{
					_id: 'k1',
					email: 'p1@example.com',
					externalSources: [
						{ appId: AppsEnum.App.GOOGLE_CONTACTS, externalId: 'people/c1' },
					],
				},
			],
		});

		const result = await service.importSelected('u1', ['people/c1']);

		expect(customers.create).not.toHaveBeenCalled();
		expect(customers.linkExternalSource).not.toHaveBeenCalled();
		expect(result).toMatchObject({ created: 0, linked: 0, skipped: 1 });
	});

	it('counts a link that was already there (race) as skipped, not linked', async () => {
		const { service, customers } = build({
			people: [person(2)],
			existing: [{ _id: 'k2', email: 'p2@example.com', externalSources: [] }],
		});
		customers.linkExternalSource.mockResolvedValue(false);

		const result = await service.importSelected('u1', ['people/c2']);

		expect(result).toMatchObject({ linked: 0, skipped: 1 });
	});

	it('counts a failing link and keeps going', async () => {
		const { service, customers } = build({
			people: [person(2), person(4)],
			existing: [{ _id: 'k2', email: 'p2@example.com', externalSources: [] }],
		});
		customers.linkExternalSource.mockRejectedValue(new Error('db down'));

		const result = await service.importSelected('u1', [
			'people/c2',
			'people/c4',
		]);

		expect(result).toMatchObject({ failed: 1, created: 1 });
	});

	it('after linking, a second selected contact with that e-mail is skipped', async () => {
		const { service, customers } = build({
			people: [
				person(1, { emailAddresses: [{ value: 'dup@example.com' }] }),
				person(2, { emailAddresses: [{ value: 'dup@example.com' }] }),
			],
			existing: [{ _id: 'k1', email: 'dup@example.com', externalSources: [] }],
		});

		const result = await service.importSelected('u1', [
			'people/c1',
			'people/c2',
		]);

		expect(customers.linkExternalSource).toHaveBeenCalledTimes(1);
		expect(result).toMatchObject({ linked: 1, skipped: 1, created: 0 });
	});

	it('does not create two customers for two selected contacts with the same e-mail', async () => {
		const { service, customers } = build({
			people: [
				person(1, { emailAddresses: [{ value: 'same@example.com' }] }),
				person(2, { emailAddresses: [{ value: 'SAME@example.com' }] }),
			],
		});

		const result = await service.importSelected('u1', [
			'people/c1',
			'people/c2',
		]);

		expect(customers.create).toHaveBeenCalledTimes(1);
		expect(result).toMatchObject({ created: 1, skipped: 1 });
	});

	it('counts selected ids Google no longer returns as skipped', async () => {
		const { service } = build({ people: [person(1)] });

		const result = await service.importSelected('u1', [
			'people/c1',
			'people/gone',
		]);

		expect(result).toMatchObject({ created: 1, skipped: 1 });
	});

	it('ignores repeated ids in the request', async () => {
		const { service, peopleClient } = build({ people: [person(1)] });

		await service.importSelected('u1', ['people/c1', 'people/c1']);

		expect(peopleClient.getByResourceNames).toHaveBeenCalledWith('AT', [
			'people/c1',
		]);
	});

	it('stops creating at the customers limit and reports it', async () => {
		const { service, customers, featureLimits } = build({
			people: [person(1), person(2), person(3)],
		});
		featureLimits.assertCanCreate
			.mockResolvedValueOnce(undefined)
			.mockRejectedValue(
				new FeatureLimitReachedException(
					FeatureLimitsEnum.Feature.CUSTOMERS,
					1,
					1,
				),
			);

		const result = await service.importSelected('u1', [
			'people/c1',
			'people/c2',
			'people/c3',
		]);

		expect(customers.create).toHaveBeenCalledTimes(1);
		expect(result).toMatchObject({
			created: 1,
			skipped: 2,
			limitReached: true,
		});
		expect(featureLimits.assertCanCreate).toHaveBeenCalledTimes(2);
	});

	it('counts a failing contact and keeps going', async () => {
		const create = jest
			.fn()
			.mockRejectedValueOnce(new Error('db down'))
			.mockResolvedValue({ _id: 'ok' });
		const { service } = build({ people: [person(1), person(2)], create });

		const result = await service.importSelected('u1', [
			'people/c1',
			'people/c2',
		]);

		expect(result).toMatchObject({ failed: 1, created: 1 });
	});

	it('does nothing for an empty selection', async () => {
		const { service, peopleClient } = build();

		const result = await service.importSelected('u1', []);

		expect(peopleClient.getByResourceNames).not.toHaveBeenCalled();
		expect(result).toMatchObject({ created: 0, skipped: 0, failed: 0 });
	});

	it('looks the existing customers up with lowercase e-mails', async () => {
		const { service, customers } = build({
			people: [person(1, { emailAddresses: [{ value: 'Mixed@Case.com' }] })],
		});

		await service.importSelected('u1', ['people/c1']);

		expect(customers.findExisting).toHaveBeenCalledWith(
			'u1',
			AppsEnum.App.GOOGLE_CONTACTS,
			['people/c1'],
			['mixed@case.com'],
		);
	});
});
