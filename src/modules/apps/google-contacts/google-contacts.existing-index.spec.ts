import AppsEnum from '../interfaces/apps.enum';
import { ExistingCustomersIndex } from './google-contacts.existing-index';

const APP = AppsEnum.App.GOOGLE_CONTACTS;

const customer = (
	id: string,
	email: string | null,
	sources: any[] = [],
): any => ({
	_id: id,
	name: `Cliente ${id}`,
	email,
	externalSources: sources,
});

describe('ExistingCustomersIndex', () => {
	it('matches by the link first, and reports it as already linked', () => {
		const index = new ExistingCustomersIndex(
			[customer('c1', 'a@x.com', [{ appId: APP, externalId: 'people/1' }])],
			APP,
		);

		expect(
			index.match({ externalId: 'people/1', email: 'other@x.com' }),
		).toMatchObject({
			customerId: 'c1',
			linked: true,
		});
	});

	it('matches by e-mail ignoring case; a customer without this app is not linked yet', () => {
		const index = new ExistingCustomersIndex(
			[customer('c1', 'Mixed@Case.com')],
			APP,
		);

		expect(
			index.match({ externalId: 'people/9', email: 'mixed@case.com' }),
		).toMatchObject({
			customerId: 'c1',
			linked: false,
		});
	});

	it('treats a customer that has another contact of this app as linked', () => {
		const index = new ExistingCustomersIndex(
			[customer('c1', 'a@x.com', [{ appId: APP, externalId: 'people/OTHER' }])],
			APP,
		);

		expect(
			index.match({ externalId: 'people/2', email: 'a@x.com' }),
		).toMatchObject({
			customerId: 'c1',
			linked: true,
		});
	});

	it('a source from another app does not count as linked to this one', () => {
		const index = new ExistingCustomersIndex(
			[
				customer('c1', 'a@x.com', [
					{ appId: AppsEnum.App.INSTAGRAM, externalId: 'ig/1' },
				]),
			],
			APP,
		);

		expect(
			index.match({ externalId: 'people/2', email: 'a@x.com' }),
		).toMatchObject({
			customerId: 'c1',
			linked: false,
		});
	});

	it('returns null when nothing matches, and for contacts without e-mail', () => {
		const index = new ExistingCustomersIndex([customer('c1', 'a@x.com')], APP);

		expect(
			index.match({ externalId: 'people/3', email: 'zzz@x.com' }),
		).toBeNull();
		expect(index.match({ externalId: 'people/3', email: null })).toBeNull();
	});

	it('tolerates customers without an externalSources array or e-mail', () => {
		const index = new ExistingCustomersIndex(
			[
				{ _id: 'c1', email: null } as any,
				{ _id: 'c2', email: 'b@x.com' } as any,
			],
			APP,
		);

		expect(
			index.match({ externalId: 'people/1', email: 'b@x.com' }),
		).toMatchObject({
			customerId: 'c2',
			linked: false,
		});
	});

	it('register makes later contacts see the new customer or link', () => {
		const index = new ExistingCustomersIndex([], APP);

		index.register('c9', { externalId: 'people/7', email: 'new@x.com' });

		expect(index.match({ externalId: 'people/7', email: null })).toMatchObject({
			customerId: 'c9',
			linked: true,
		});
		expect(
			index.match({ externalId: 'people/8', email: 'NEW@x.com' }),
		).toMatchObject({ customerId: 'c9', linked: true });
	});

	it('tells the name of the customer a contact matches, to show who it is', () => {
		const index = new ExistingCustomersIndex(
			[
				customer('c1', 'a@x.com', [{ appId: APP, externalId: 'people/1' }]),
				customer('c2', 'b@x.com'),
			],
			APP,
		);

		expect(index.match({ externalId: 'people/1', email: null })).toMatchObject({
			customerName: 'Cliente c1',
		});
		expect(
			index.match({ externalId: 'people/9', email: 'b@x.com' }),
		).toMatchObject({
			customerName: 'Cliente c2',
		});

		index.register('c3', { externalId: 'people/3', email: null }, 'Nova');
		expect(index.match({ externalId: 'people/3', email: null })).toMatchObject({
			customerId: 'c3',
			customerName: 'Nova',
		});
	});
});
