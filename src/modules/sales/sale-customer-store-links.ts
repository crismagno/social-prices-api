import { ICustomerStoreLink } from '../customers/interfaces/customers.type';
import { ISale } from './interfaces/sale.interface';

/**
 * Which customer bought in which store, once per pair, over any number of sales.
 * Stores sold without a customer, and missing sales, are skipped.
 */
export const customerStoreLinksOf = (
	sales: Pick<ISale, 'stores'>[],
): ICustomerStoreLink[] => {
	const links: Map<string, ICustomerStoreLink> = new Map();

	for (const sale of sales) {
		for (const store of sale?.stores ?? []) {
			if (!store?.customerId || !store.storeId) {
				continue;
			}

			const link: ICustomerStoreLink = {
				customerId: String(store.customerId),
				storeId: String(store.storeId),
			};

			links.set(`${link.customerId}:${link.storeId}`, link);
		}
	}

	return [...links.values()];
};
