import mongoose from 'mongoose';

import { IAddress } from '../../../shared/interfaces/address.interface';
import { ICreatedAtEntity } from '../../../shared/interfaces/created-at.interface';
import { IPhoneNumber } from '../../../shared/interfaces/phone-number';
import { ISoftDeleteEntity } from '../../../shared/interfaces/soft-delete.interface';
import { IUpdatedAtEntity } from '../../../shared/interfaces/updated-at.interface';
import { ICustomer } from '../../customers/interfaces/customer.interface';
import UsersEnum from '../../users/interfaces/users.enum';
import SalesEnum from './sales.enum';

export interface ISale
	extends ICreatedAtEntity,
		IUpdatedAtEntity,
		ISoftDeleteEntity {
	readonly _id: string;
	createdByUserId: mongoose.Schema.Types.ObjectId | null;
	updatedByUserId: mongoose.Schema.Types.ObjectId | null;
	buyer: ISaleBuyer | null;
	number: number;
	type: SalesEnum.Type;
	totals: ISaleTotals;
	header: ISaleHeader;
	note: string | null;
	status: SalesEnum.Status;
	payments: ISalePayment[];
	stores: ISaleStore[];
	paymentStatus: SalesEnum.PaymentStatus;
}

export interface ISaleStore {
	storeId: mongoose.Schema.Types.ObjectId;
	number: number;
	products: ISaleStoreProduct[];
	totals: ISaleTotals;
	customerId: mongoose.Schema.Types.ObjectId | null;
	customer?: ICustomer;
}

export interface ISaleTotals {
	subtotalAmount: number;
	discount: ISaleTotalsDiscount | null;
	tax: ISaleAmountNote | null;
	shipping: ISaleAmountNote | null;
	totalFinalAmount: number;
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
	productId: string;
	price: number;
	quantity: number;
	barCode: string;
	note: string | null;
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
	gender: UsersEnum.Gender | null;
	phoneNumber: IPhoneNumber | null;
	address: IAddress | null;
}

export interface ISaleAmountNote {
	amount: number;
	note: string | null;
}
