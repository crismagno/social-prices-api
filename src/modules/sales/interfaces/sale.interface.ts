import mongoose from 'mongoose';

import { IAddress } from '../../../shared/common/address/address.interface';
import { ICreatedAtEntity } from '../../../shared/common/global/created-at.interface';
import { IUpdatedAtEntity } from '../../../shared/common/global/updated-at.interface';
import PersonEnum from '../../../shared/common/person/person.enum';
import { IPhoneNumber } from '../../../shared/common/phone/phone-number.interface';
import { ISoftDeleteEntity } from '../../../shared/common/soft-delete/soft-delete.interface';
import { ICustomer } from '../../customers/interfaces/customer.interface';
import { IEmployee } from '../../employees/interfaces/employee.interface';
import { IProductItem } from '../../product-items/interfaces/product-item.interface';
import { IProduct } from '../../products/interfaces/product.interface';
import { IStore } from '../../stores/interfaces/store.interface';
import { IUser } from '../../users/interfaces/user.interface';
import SalesEnum from './sales.enum';

export interface ISale
	extends ICreatedAtEntity,
		IUpdatedAtEntity,
		ISoftDeleteEntity {
	readonly _id: mongoose.Schema.Types.ObjectId;
	createdByUserId: mongoose.Schema.Types.ObjectId | null;
	user?: IUser;
	updatedByUserId: mongoose.Schema.Types.ObjectId | null;
	createdByEmployeeId: mongoose.Schema.Types.ObjectId | null;
	updatedByEmployeeId: mongoose.Schema.Types.ObjectId | null;
	createdByEmployee?: IEmployee;
	updatedByEmployee?: IEmployee;
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
	createdDate: Date; // Date of creation sale on his store parsed by user
	filesUrl: string[];
	noteToCustomer: string | null;
	previousCustomerIds: string[];
	isSendCustomerNotifications: boolean;
	completedAt: Date | null;
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
	store?: IStore;
	/**
	 * We can have different customerId by each store in a future when customer come doing a buy in shop so he can make a buy in multiple stores,
	 * and each store by user can have a customerId specifically
	 */
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
	distributed: ISaleAmountNote;
}

export interface ISalePayment {
	type: SalesEnum.PaymentType;
	status: SalesEnum.PaymentStatus;
	amount: number;
	provider: any | null;
	note: string | null;
}

export interface ISaleStoreProduct {
	product?: IProduct;
	productId: mongoose.Schema.Types.ObjectId;
	price: number;
	quantity: number;
	barcode: string;
	note: string | null;
	discount: ISaleStoreProductDiscount | null;
	isValid: boolean;
	isCompleted: boolean;
	sku: string;
	productItemId: mongoose.Schema.Types.ObjectId;
	productItem?: IProductItem;
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
