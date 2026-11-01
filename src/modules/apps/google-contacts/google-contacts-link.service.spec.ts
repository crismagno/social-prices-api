import AppsEnum from '../interfaces/apps.enum';
import {
	GoogleContactsContactAlreadyLinkedException,
	GoogleContactsCustomerAlreadyLinkedException,
	GoogleContactsCustomerNotFoundException,
} from './google-contacts.exceptions';
import { GoogleContactsLinkService } from './google-contacts-link.service';

const APP = AppsEnum.App.GOOGLE_CONTACTS;

const build = (over: any = {}) => {
	const customers: any = {
		findOwned: jest
			.fn()
			.mockResolvedValue({ _id: 'cu1', name: 'Ana Cliente', ...over.owned }),
		linkExternalSource: jest.fn().mockResolvedValue(true),
		findExisting: jest.fn().mockResolvedValue(over.existing ?? []),
		findByExternalId: jest.fn().mockResolvedValue(over.byExternalId ?? null),
		unlinkExternalSource: jest.fn().mockResolvedValue(undefined),
	};

	return { customers, service: new GoogleContactsLinkService(customers) };
};

describe('GoogleContactsLinkService', () => {
	describe('linkContact', () => {
		it("ties a Google contact to one of the user's customers, touching nothing else", async () => {
			const { service, customers } = build();

			await expect(
				service.linkContact('u1', 'people/c1', 'cu1'),
			).resolves.toEqual({ customerId: 'cu1', customerName: 'Ana Cliente' });

			expect(customers.findOwned).toHaveBeenCalledWith('u1', 'cu1');
			expect(customers.linkExternalSource).toHaveBeenCalledWith(
				'cu1',
				APP,
				'people/c1',
			);
		});

		it("refuses a customer that is not this user's, linking nothing", async () => {
			const { service, customers } = build();
			customers.findOwned.mockResolvedValue(null);

			await expect(
				service.linkContact('u1', 'people/c1', 'other'),
			).rejects.toBeInstanceOf(GoogleContactsCustomerNotFoundException);
			expect(customers.linkExternalSource).not.toHaveBeenCalled();
		});

		it('refuses a customer that already has a Google contact', async () => {
			const { service, customers } = build();
			customers.linkExternalSource.mockResolvedValue(false);

			await expect(
				service.linkContact('u1', 'people/c1', 'cu1'),
			).rejects.toBeInstanceOf(GoogleContactsCustomerAlreadyLinkedException);
		});

		it('refuses a contact that already is linked to another customer', async () => {
			const { service, customers } = build();
			customers.linkExternalSource.mockRejectedValue({ code: 11000 });

			await expect(
				service.linkContact('u1', 'people/c1', 'cu1'),
			).rejects.toBeInstanceOf(GoogleContactsContactAlreadyLinkedException);
		});

		it('lets any other failure through', async () => {
			const { service, customers } = build();
			customers.linkExternalSource.mockRejectedValue(new Error('db down'));

			await expect(
				service.linkContact('u1', 'people/c1', 'cu1'),
			).rejects.toThrow('db down');
		});
	});

	describe('relinkContact', () => {
		const current = { _id: 'old1', name: 'Ana Antiga' };

		it('takes the link off the old customer and puts it on the new one', async () => {
			const { service, customers } = build({ byExternalId: current });

			await expect(
				service.relinkContact('u1', 'people/c1', 'cu1'),
			).resolves.toEqual({ customerId: 'cu1', customerName: 'Ana Cliente' });

			expect(customers.unlinkExternalSource).toHaveBeenCalledWith(
				'old1',
				APP,
				'people/c1',
			);
			expect(customers.linkExternalSource).toHaveBeenCalledWith(
				'cu1',
				APP,
				'people/c1',
			);
		});

		it('also ties a contact that had no customer yet', async () => {
			const { service, customers } = build();

			await service.relinkContact('u1', 'people/c1', 'cu1');

			expect(customers.unlinkExternalSource).not.toHaveBeenCalled();
			expect(customers.linkExternalSource).toHaveBeenCalledTimes(1);
		});

		it('does nothing when the contact is already on that customer', async () => {
			const { service, customers } = build({
				byExternalId: { _id: 'cu1', name: 'Ana Cliente' },
			});

			await expect(
				service.relinkContact('u1', 'people/c1', 'cu1'),
			).resolves.toEqual({ customerId: 'cu1', customerName: 'Ana Cliente' });

			expect(customers.unlinkExternalSource).not.toHaveBeenCalled();
			expect(customers.linkExternalSource).not.toHaveBeenCalled();
		});

		it("refuses a customer that is not this user's, changing nothing", async () => {
			const { service, customers } = build({ byExternalId: current });
			customers.findOwned.mockResolvedValue(null);

			await expect(
				service.relinkContact('u1', 'people/c1', 'other'),
			).rejects.toBeInstanceOf(GoogleContactsCustomerNotFoundException);
			expect(customers.unlinkExternalSource).not.toHaveBeenCalled();
		});

		it('puts the old link back when the new customer already has a Google contact', async () => {
			const { service, customers } = build({ byExternalId: current });
			customers.linkExternalSource.mockResolvedValueOnce(false);

			await expect(
				service.relinkContact('u1', 'people/c1', 'cu1'),
			).rejects.toBeInstanceOf(GoogleContactsCustomerAlreadyLinkedException);

			expect(customers.linkExternalSource).toHaveBeenLastCalledWith(
				'old1',
				APP,
				'people/c1',
			);
		});

		it('puts the old link back and says so when the database refuses the new one', async () => {
			const { service, customers } = build({ byExternalId: current });
			customers.linkExternalSource.mockRejectedValueOnce({ code: 11000 });

			await expect(
				service.relinkContact('u1', 'people/c1', 'cu1'),
			).rejects.toBeInstanceOf(GoogleContactsContactAlreadyLinkedException);
			expect(customers.linkExternalSource).toHaveBeenLastCalledWith(
				'old1',
				APP,
				'people/c1',
			);
		});
	});

	describe('findCustomersOf', () => {
		it('gives the customer and its name for each contact that has one, and nothing for the others', async () => {
			const { service, customers } = build({
				existing: [
					{
						_id: 'cu7',
						name: 'Beto',
						externalSources: [
							{ appId: APP, externalId: 'people/c1' },
							{ appId: 'TELEGRAM', externalId: '1' },
						],
					},
					{
						_id: 'cu8',
						name: null,
						// Matched by e-mail only, or holding another contact: not the ones asked for.
						externalSources: [{ appId: APP, externalId: 'people/zzz' }],
					},
				],
			});

			await expect(
				service.findCustomersOf('u1', ['people/c1', 'people/c2']),
			).resolves.toEqual([
				{ externalId: 'people/c1', customerId: 'cu7', customerName: 'Beto' },
			]);
			expect(customers.findExisting).toHaveBeenCalledWith(
				'u1',
				APP,
				['people/c1', 'people/c2'],
				[],
			);
		});
	});

	describe('findCustomerOf', () => {
		it('says which customer a contact is linked to', async () => {
			const { service, customers } = build({
				byExternalId: { _id: 'cu7', name: 'Beto' },
			});

			await expect(service.findCustomerOf('u1', 'people/c1')).resolves.toEqual({
				customerId: 'cu7',
			});
			expect(customers.findByExternalId).toHaveBeenCalledWith(
				'u1',
				APP,
				'people/c1',
			);
		});

		it('says none when it is not linked to anyone', async () => {
			const { service } = build();

			await expect(service.findCustomerOf('u1', 'people/c1')).resolves.toEqual({
				customerId: null,
			});
		});
	});
});
