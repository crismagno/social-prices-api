import { customerStoreLinksOf } from './sale-customer-store-links';

const sale = (
	stores: { storeId: string; customerId: string | null }[],
): any => ({
	stores,
});

describe('customerStoreLinksOf', () => {
	it('gives one link per store with a customer', () => {
		expect(
			customerStoreLinksOf([
				sale([
					{ storeId: 's1', customerId: 'c1' },
					{ storeId: 's2', customerId: 'c1' },
				]),
			]),
		).toEqual([
			{ customerId: 'c1', storeId: 's1' },
			{ customerId: 'c1', storeId: 's2' },
		]);
	});

	it('skips stores without a customer', () => {
		expect(
			customerStoreLinksOf([sale([{ storeId: 's1', customerId: null }])]),
		).toEqual([]);
	});

	it('deduplicates across sales', () => {
		expect(
			customerStoreLinksOf([
				sale([{ storeId: 's1', customerId: 'c1' }]),
				sale([{ storeId: 's1', customerId: 'c1' }]),
			]),
		).toEqual([{ customerId: 'c1', storeId: 's1' }]);
	});

	it('is empty for no sales, or a sale that is missing', () => {
		expect(customerStoreLinksOf([])).toEqual([]);
		expect(customerStoreLinksOf([null, undefined] as any)).toEqual([]);
	});
});
