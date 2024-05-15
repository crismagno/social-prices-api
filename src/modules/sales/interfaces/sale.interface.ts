import mongoose from 'mongoose';

import { IAddress } from '../../../shared/interfaces/address.interface';
import { ICreatedAtEntity } from '../../../shared/interfaces/created-at.interface';
import { IUpdatedAtEntity } from '../../../shared/interfaces/updated-at.interface';
import SalesEnum from './sales.enum';

export interface ISale extends ICreatedAtEntity, IUpdatedAtEntity {
	readonly _id: string;
	description: string | null;
	ownerUserId: mongoose.Schema.Types.ObjectId;
	createdByUserId: mongoose.Schema.Types.ObjectId;
	customerId: mongoose.Schema.Types.ObjectId;
	storeId: mongoose.Schema.Types.ObjectId;
	number: string;
	type: SalesEnum.Type;
	payment: ISalePayment;
	totals: ISaleTotals;
	note: string | null;
	products: ISaleProduct[];
	header: ISaleHeader;
	status: SalesEnum.Status;
}

export interface ISaleTotals {
	subtotal: number;
	discount: ISaleTotalsDiscount | null;
	tax: number;
	shipping: number;
	totalFinal: number;
}

export interface ISaleTotalsDiscount {
	normal: number;
}

export interface ISalePayment {
	type: SalesEnum.PaymentType;
	status: SalesEnum.PaymentStatus;
	provider: any | null;
}

export interface ISaleProduct {
	productId: string;
	price: number;
	quantity: number;
	barCode: string;
	note: string | null;
}

export interface ISaleHeader {
	billingAddress: IAddress;
	shippingAddress: IAddress;
}
