import mongoose, { Document } from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { IAddress } from '../../../shared/interfaces/address.interface';
import { IPhoneNumber } from '../../../shared/interfaces/phone-number';
import { AddressSchema } from '../../../shared/schemas/address.schema';
import { PhoneNumberSchema } from '../../../shared/schemas/phone-number.schema';
import UsersEnum from '../../users/interfaces/users.enum';
import {
	ISale,
	ISaleBuyer,
	ISaleHeader,
	ISaleHeaderBilling,
	ISaleHeaderShipping,
	ISalePayment,
	ISaleStore,
	ISaleStoreProduct,
	ISaleTotals,
	ISaleTotalsDiscount,
} from './sale.interface';
import SalesEnum from './sales.enum';

@Schema()
export class SalePayment implements ISalePayment {
	@Prop({
		required: true,
		type: String,
		enum: {
			values: Object.keys(SalesEnum.PaymentType),
			message: '{VALUE} is not supported',
		},
	})
	type: SalesEnum.PaymentType;

	@Prop({
		required: true,
		type: String,
		enum: {
			values: Object.keys(SalesEnum.PaymentStatus),
			message: '{VALUE} is not supported',
		},
	})
	status: SalesEnum.PaymentStatus;

	@Prop({ type: mongoose.Schema.Types.Mixed })
	provider: any | null;

	@Prop({ required: true, type: Number })
	amount: number;
}

export const SalePaymentSchema = SchemaFactory.createForClass(SalePayment);

@Schema()
export class SaleTotalsDiscount implements ISaleTotalsDiscount {
	@Prop({ required: true, type: Number })
	normal: number;
}

export const SaleTotalsDiscountSchema =
	SchemaFactory.createForClass(SaleTotalsDiscount);

@Schema()
export class SaleTotals implements ISaleTotals {
	@Prop({ required: true, type: Number })
	subtotalAmount: number;

	@Prop({ type: SaleTotalsDiscountSchema })
	discount: ISaleTotalsDiscount | null;

	@Prop({ type: Number })
	taxAmount: number | null;

	@Prop({ type: Number })
	shippingAmount: number | null;

	@Prop({ required: true, type: Number })
	totalFinalAmount: number;
}

export const SaleTotalsSchema = SchemaFactory.createForClass(SaleTotals);

@Schema()
export class SaleStoreProduct implements ISaleStoreProduct {
	@Prop({ required: true, type: String })
	productId: string;

	@Prop({ required: true, type: Number })
	price: number;

	@Prop({ required: true, type: Number })
	quantity: number;

	@Prop({ required: true, type: String })
	barCode: string;

	@Prop({ type: String })
	note: string | null;
}

export const SaleStoreProductSchema =
	SchemaFactory.createForClass(SaleStoreProduct);

@Schema()
export class SaleHeaderBilling implements ISaleHeaderBilling {
	@Prop({ type: AddressSchema })
	address: IAddress | null;
}

export const SaleHeaderBillingSchema =
	SchemaFactory.createForClass(SaleHeaderBilling);

export class SaleHeaderShipping implements ISaleHeaderShipping {
	@Prop({ type: AddressSchema })
	address: IAddress | null;
}

export const SaleHeaderShippingSchema =
	SchemaFactory.createForClass(SaleHeaderShipping);

@Schema()
export class SaleHeader implements ISaleHeader {
	@Prop({ type: SaleHeaderBillingSchema })
	billing: ISaleHeaderBilling | null;

	@Prop({ type: SaleHeaderShippingSchema })
	shipping: ISaleHeaderShipping | null;

	@Prop({
		required: true,
		type: String,
		enum: {
			values: Object.keys(SalesEnum.DeliveryType),
			message: '{VALUE} is not supported',
		},
	})
	deliveryType: SalesEnum.DeliveryType;
}

export const SaleHeaderSchema = SchemaFactory.createForClass(SaleHeader);

@Schema()
export class SaleStore implements ISaleStore {
	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
	storeId: mongoose.Schema.Types.ObjectId;

	@Prop({ required: true, type: [SaleStoreProductSchema] })
	products: ISaleStoreProduct[];

	@Prop({ required: true, type: SaleTotalsSchema })
	totals: ISaleTotals;

	@Prop({ type: mongoose.Schema.Types.ObjectId })
	customerId: mongoose.Schema.Types.ObjectId;

	@Prop({ required: true, type: String })
	number: string;
}

export const SaleStoreSchema = SchemaFactory.createForClass(SaleStore);

@Schema()
export class SaleBuyer implements ISaleBuyer {
	@Prop({ type: mongoose.Schema.Types.ObjectId })
	userId: mongoose.Schema.Types.ObjectId | null;

	@Prop({ type: String, required: true })
	email: string;

	@Prop({ type: String, required: true })
	name: string;

	@Prop({ type: Date })
	birthDate: Date | null;

	@Prop({
		type: String,
		enum: {
			values: Object.keys(UsersEnum.Gender),
			message: '{VALUE} is not supported',
		},
	})
	gender: UsersEnum.Gender | null;

	@Prop({ type: PhoneNumberSchema })
	phoneNumber: IPhoneNumber | null;

	@Prop({ type: AddressSchema })
	address: IAddress | null;
}

export const SaleBuyerSchema = SchemaFactory.createForClass(SaleBuyer);

@Schema()
export class Sale extends Document implements ISale {
	readonly _id: string;

	@Prop({ type: String })
	description: string | null;

	@Prop({ type: mongoose.Schema.Types.ObjectId })
	createdByUserId: mongoose.Schema.Types.ObjectId | null;

	@Prop({ type: SaleBuyerSchema })
	buyer: ISaleBuyer | null;

	@Prop({ required: true, type: String })
	number: string;

	@Prop({
		required: true,
		type: String,
		enum: {
			values: Object.keys(SalesEnum.Type),
			message: '{VALUE} is not supported',
		},
	})
	type: SalesEnum.Type;

	@Prop({ required: true, type: SaleTotalsSchema })
	totals: ISaleTotals;

	@Prop({ required: true, type: SaleHeaderSchema })
	header: ISaleHeader;

	@Prop({ String })
	note: string | null;

	@Prop({
		required: true,
		type: String,
		enum: {
			values: Object.keys(SalesEnum.Status),
			message: '{VALUE} is not supported',
		},
	})
	status: SalesEnum.Status;

	@Prop({ required: true, type: [SalePaymentSchema] })
	payments: ISalePayment[];

	@Prop({ required: true, type: [SaleStoreSchema] })
	stores: ISaleStore[];

	@Prop({ required: true, type: Date })
	createdAt: Date;

	@Prop({ required: true, type: Date })
	updatedAt: Date;
}

export const SaleSchema = SchemaFactory.createForClass(Sale);
