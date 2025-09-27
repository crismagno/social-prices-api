import { reduce } from 'lodash';

import { unFreezeData } from '../../shared/utils/objects/objects';
import {
	ISale,
	ISalePayment,
	ISaleStore,
	ISaleStoreProduct,
} from './interfaces/sale.interface';

export const getTotalPayment = (sale: ISale): number => {
	const total: number = reduce(
		sale.payments,
		(acc: number, payment: ISalePayment) => {
			acc += payment.amount;

			return acc;
		},
		0,
	);

	return total > 0 ? total : 0;
};

export const getQuantity = (sale: ISale): number => {
	const quantity: number = reduce(
		sale.stores,
		(accSaleStore: number, saleStore: ISaleStore) => {
			const productsQuantityPrice = reduce(
				saleStore.products,
				(accSaleStoreProduct: number, saleStoreProduct: ISaleStoreProduct) => {
					accSaleStoreProduct += saleStoreProduct.quantity;

					return accSaleStoreProduct;
				},
				0,
			);

			accSaleStore += productsQuantityPrice;

			return accSaleStore;
		},
		0,
	);

	return quantity;
};

export const getTotalAfterDiscount = (sale: ISale): number => {
	const discountAmount: number = sale.totals.discount?.distributed.amount ?? 0;

	const totalAfterDiscount: number =
		sale.totals.subtotalAmount - discountAmount;

	return totalAfterDiscount > 0 ? totalAfterDiscount : 0;
};

export const getTotalAfterPayment = (
	sale: ISale,
	totalPayment: number,
): number => sale.totals.totalFinalAmount - totalPayment;

export const parsePopulatedSales = (sales: ISale[]): ISale[] => {
	sales = unFreezeData(sales);

	sales.forEach((sale: ISale) => {
		sale.stores = parsePopulatedSaleStores(sale.stores);
	});

	return sales;
};

export const parsePopulatedSaleStores = (
	saleStores: ISaleStore[],
): ISaleStore[] => {
	return unFreezeData(saleStores).map((saleStore: ISaleStore): ISaleStore => {
		saleStore.products = unFreezeData(saleStore.products).map(
			(product: ISaleStoreProduct): ISaleStoreProduct => {
				return {
					...product,
					product: product.productId as any,
				};
			},
		);

		return {
			...saleStore,
			store: saleStore.storeId as any,
			customer: saleStore.customerId as any,
		};
	});
};
