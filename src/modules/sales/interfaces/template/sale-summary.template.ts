import { map } from 'lodash';
import * as moment from 'moment-timezone';

import PersonEnum from '../../../../shared/common/person/person.enum';
import DatesEnum from '../../../../shared/utils/dates/dates.enum';
import {
	getImageAvatarDefault,
	getImageUrl,
	getLogo1,
} from '../../../../shared/utils/images/url-images';
import {
	createAddressName,
	formatToMoneyDecimal,
} from '../../../../shared/utils/strings/strings';
import { ICustomer } from '../../../customers/interfaces/customer.interface';
import { IProduct } from '../../../products/interfaces/product.interface';
import { IUser } from '../../../users/interfaces/user.interface';
import {
	getQuantity,
	getTotalAfterDiscount,
	getTotalAfterPayment,
	getTotalPayment,
} from '../../sales.utils';
import {
	ISale,
	ISaleBuyer,
	ISalePayment,
	ISaleStore,
	ISaleStoreProduct,
} from '../sale.interface';
import SalesEnum from '../sales.enum';

export interface ISaleSummaryTemplate {
	saleNumber: string;
	customer: ISaleSummaryCustomerTemplate;
	shippingAddress?: string;
	deliveryType: string;
	stores: ISaleSummaryStoreTemplate[];
	payments: ISaleSummaryPaymentTemplate[];
	totalPayment: string;
	totalAfterPayment: string;
	saleStatus: string;
	paymentStatus: string;
	deliveryAt: string;
	createdDate: string;
	saleNumberManual: string;
	totals: ISaleSummaryTotalsTemplate;
	noteToCustomer: string;
	logoSrc: string;
	dateNow: string;
	lastUpdated: string;
	user: ISaleSummaryUser;
}

export interface ISaleSummaryCustomerTemplate {
	name: string;
	email: string;
	phone: string;
	birthDate?: string;
	gender?: string;
	avatar?: string;
}

export interface ISaleSummaryStoreTemplate {
	name: string;
	products: ISaleSummaryStoreProductTemplate[];
}

export interface ISaleSummaryStoreProductTemplate {
	image: string;
	name: string;
	barcode: string;
	quantity: number;
	price: string;
	total: string;
	status: string;
}

export interface ISaleSummaryTotalsTemplate {
	quantity: number;
	subtotal: string;
	discount: string;
	totalAfterDiscount: string;
	shipping: string;
	tax: string;
	total: string;
}

export interface ISaleSummaryPaymentTemplate {
	type: string;
	amount: string;
}

export interface ISaleSummaryUser {
	avatar: string;
	name: string;
	email: string;
	phoneNumber: string;
}

export const getSaleSummaryTemplate = (sale: ISale): ISaleSummaryTemplate => {
	const buyer: ISaleBuyer = sale.buyer;

	const customer: ICustomer | undefined = sale?.stores?.[0].customer;

	const user: IUser | undefined = sale?.user;

	const quantityTotal = getQuantity(sale);

	const totalAfterDiscount: number = getTotalAfterDiscount(sale);

	const totalPayment: number = getTotalPayment(sale);

	const totalAfterPayment: number = getTotalAfterPayment(sale, totalPayment);

	return {
		createdDate: sale.createdDate
			? moment(sale.createdDate).format(DatesEnum.Format.DDMMYYYYhhmmss)
			: '',
		customer: {
			email: buyer.email,
			name: buyer.name,
			phone: buyer.phoneNumber?.number,
			birthDate: buyer.birthDate
				? moment(buyer.birthDate).format(DatesEnum.Format.MMDDYYYY)
				: '',
			gender: PersonEnum.GenderLabels[buyer.gender],
			avatar: customer?.avatar
				? getImageUrl(customer.avatar)
				: getImageAvatarDefault(),
		},
		deliveryAt: sale.deliveryAt
			? moment(sale.deliveryAt).format(DatesEnum.Format.DDMMYYY)
			: '',
		deliveryType: SalesEnum.DeliveryTypeLabels[sale.header.deliveryType],
		payments: map(
			sale.payments,
			(salePayment: ISalePayment): ISaleSummaryPaymentTemplate => ({
				amount: formatToMoneyDecimal(salePayment.amount ?? 0),
				type: SalesEnum.PaymentTypeLabels[salePayment.type],
			}),
		),
		paymentStatus: SalesEnum.PaymentStatusLabels[sale.paymentStatus],
		saleNumber: sale.number.toString(),
		saleNumberManual: sale.numberManual,
		saleStatus: SalesEnum.StatusLabels[sale.status],
		stores: map(
			sale.stores,
			(saleStore: ISaleStore): ISaleSummaryStoreTemplate => {
				const saleSummaryStoreProducts: ISaleSummaryStoreProductTemplate[] =
					map(
						saleStore.products,
						(
							saleStoreProduct: ISaleStoreProduct,
						): ISaleSummaryStoreProductTemplate => {
							const product: IProduct | undefined = saleStoreProduct.product;

							const fileUrl: string = product?.mainUrl
								? getImageUrl(product.mainUrl)
								: getImageAvatarDefault();

							const price: number = saleStoreProduct.price;

							const quantity: number = saleStoreProduct.quantity;

							const total: number = quantity * price;

							return {
								barcode: saleStoreProduct.barcode ?? '',
								image: fileUrl,
								name: product?.name ?? '',
								price: formatToMoneyDecimal(price),
								quantity: quantity,
								total: formatToMoneyDecimal(total),
								status: !saleStoreProduct.isValid
									? 'invalid'
									: saleStoreProduct.isCompleted
									? 'completed'
									: 'normal',
							};
						},
					);

				return {
					name: saleStore.store?.name ?? '---',
					products: saleSummaryStoreProducts,
				};
			},
		),
		totalAfterPayment: formatToMoneyDecimal(totalAfterPayment),
		totalPayment: formatToMoneyDecimal(totalPayment),
		shippingAddress: createAddressName(buyer.address),
		totals: {
			discount: formatToMoneyDecimal(
				sale.totals.discount?.distributed.amount ?? 0,
			),
			quantity: quantityTotal,
			shipping: formatToMoneyDecimal(sale.totals.shipping.amount ?? 0),
			subtotal: formatToMoneyDecimal(sale.totals.subtotalAmount ?? 0),
			tax: formatToMoneyDecimal(sale.totals.tax.amount ?? 0),
			total: formatToMoneyDecimal(sale.totals.totalFinalAmount ?? 0),
			totalAfterDiscount: formatToMoneyDecimal(totalAfterDiscount),
		},
		noteToCustomer: sale.noteToCustomer ?? '',
		logoSrc: getLogo1(),
		dateNow: moment().format(DatesEnum.Format.DDMMYYYYhhmmss),
		lastUpdated: moment(sale.updatedAt).format(DatesEnum.Format.DDMMYYYYhhmmss),
		user: {
			avatar: user?.avatar
				? getImageUrl(user?.avatar)
				: getImageAvatarDefault(),
			name: user?.name ?? '-',
			email: user?.email ?? '-',
			phoneNumber: user?.phoneNumbers?.[0].number ?? '-',
		},
	};
};
