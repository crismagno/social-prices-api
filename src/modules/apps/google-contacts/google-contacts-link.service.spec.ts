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
		findByExternalId: jest.fn().mockResolvedValue(over.byExternalId ?? null),
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
