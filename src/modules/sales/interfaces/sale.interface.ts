import mongoose from 'mongoose';

import { IAddress } from '../../../shared/common/address/address.interface';
import { ICreatedAtEntity } from '../../../shared/common/global/created-at.interface';
import { IUpdatedAtEntity } from '../../../shared/common/global/updated-at.interface';
import PersonEnum from '../../../shared/common/person/person.enum';
import { IPhoneNumber } from '../../../shared/common/phone/phone-number.interface';
import { ISoftDeleteEntity } from '../../../shared/common/soft-delete/soft-delete.interface';
import { ICustomer } from '../../customers/interfaces/customer.interface';
import { IProduct } from '../../products/interfaces/product.interface';
import SalesEnum from './sales.enum';

export interface ISale
	extends ICreatedAtEntity,
		IUpdatedAtEntity,
		ISoftDeleteEntity {
	readonly _id: string;
	createdByUserId: mongoose.Schema.Types.ObjectId | null;
	updatedByUserId: mongoose.Schema.Types.ObjectId | null;
	createdByEmployeeId: mongoose.Schema.Types.ObjectId | null;
	updatedByEmployeeId: mongoose.Schema.Types.ObjectId | null;
	buyer: ISaleBuyer | null;
	number: number;
	numberManual: string | null;
	type: SalesEnum.Type;
	totals: ISaleTotals;
	header: ISaleHeader;
	note: string | null;
	status: SalesEnum.Status;
	payments: ISalePayment[];
	stores: ISaleStore[];
	paymentStatus: SalesEnum.PaymentStatus;
	tagsIds: mongoose.Schema.Types.ObjectId[];
	deliveryAt: Date | null;
	uploadFilename: string | null;
	createdDate: Date | null; // Date of creation sale on his store parsed by user
}

export interface ISaleTotals {
	subtotalAmount: number;
	discount: ISaleTotalsDiscount | null;
	tax: ISaleAmountNote | null;
	shipping: ISaleAmountNote | null;
	totalFinalAmount: number;
}

export interface ISaleStore {
	storeId: mongoose.Schema.Types.ObjectId;
	number: number;
	products: ISaleStoreProduct[];
	totals: ISaleStoreTotals;
	customerId: mongoose.Schema.Types.ObjectId | null;
	customer?: ICustomer;
}

export interface ISaleStoreTotals {
	subtotalAmount: number;
	discount: ISaleStoreTotalsDiscount | null;
	tax: ISaleAmountNote | null;
	shipping: ISaleAmountNote | null;
	totalFinalAmount: number;
}

export interface ISaleStoreTotalsDiscount {
	distributedAmount: number | null;
}

export interface ISaleTotalsDiscount {
	normal: ISaleAmountNote;
}

export interface ISalePayment {
	type: SalesEnum.PaymentType;
	status: SalesEnum.PaymentStatus;
	amount: number;
	provider: any | null;
}

export interface ISaleStoreProduct {
	product?: IProduct;
	productId: mongoose.Schema.Types.ObjectId;
	price: number;
	quantity: number;
	barcode: string;
	note: string | null;
	discount: ISaleStoreProductDiscount | null;
}

export interface ISaleHeader {
	billing: ISaleHeaderBilling | null;
	shipping: ISaleHeaderShipping | null;
	deliveryType: SalesEnum.DeliveryType;
}

export interface ISaleHeaderBilling {
	address: IAddress | null;
}

export interface ISaleHeaderShipping {
	address: IAddress | null;
}

export interface ISaleBuyer {
	userId: mongoose.Schema.Types.ObjectId | null;
	email: string;
	name: string;
	birthDate: Date | null;
	gender: PersonEnum.Gender | null;
	phoneNumber: IPhoneNumber | null;
	address: IAddress | null;
}

export interface ISaleAmountNote {
	amount: number;
	note: string | null;
}

export interface ISaleStoreProductDiscount {
	distributedAmount: number | null;
}
