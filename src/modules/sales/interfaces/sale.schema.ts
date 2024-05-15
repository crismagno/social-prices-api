import mongoose, { Document } from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { IAddress } from '../../../shared/interfaces/address.interface';
import { AddressSchema } from '../../../shared/schemas/address.schema';
import {
	ISale,
	ISaleHeader,
	ISalePayment,
	ISaleProduct,
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
}

@Schema()
export class SaleTotalsDiscount implements ISaleTotalsDiscount {
	@Prop({ required: true, type: Number })
	normal: number;
}

@Schema()
export class SaleTotals implements ISaleTotals {
	@Prop({ required: true, type: Number })
	subtotal: number;

	@Prop({ type: SaleTotalsDiscount })
	discount: ISaleTotalsDiscount | null;

	@Prop({ required: true, type: Number })
	tax: number;

	@Prop({ required: true, type: Number })
	shipping: number;

	@Prop({ required: true, type: Number })
	totalFinal: number;
}

@Schema()
export class SaleProduct implements ISaleProduct {
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

@Schema()
export class SaleHeader implements ISaleHeader {
	@Prop({ required: true, type: AddressSchema })
	billingAddress: IAddress;

	@Prop({ required: true, type: AddressSchema })
	shippingAddress: IAddress;
}

@Schema()
export class Sale extends Document implements ISale {
	readonly _id: string;

	@Prop({ type: String })
	description: string | null;

	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
	ownerUserId: mongoose.Schema.Types.ObjectId;

	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
	createdByUserId: mongoose.Schema.Types.ObjectId;

	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
	customerId: mongoose.Schema.Types.ObjectId;

	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
	storeId: mongoose.Schema.Types.ObjectId;

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

	@Prop({ required: true, type: SalePayment })
	payment: ISalePayment;

	@Prop({ required: true, type: SaleTotals })
	totals: ISaleTotals;

	@Prop({ String })
	note: string | null;

	@Prop({ required: true, type: [SaleProduct] })
	products: ISaleProduct[];

	@Prop({ required: true, type: SaleHeader })
	header: ISaleHeader;

	@Prop({
		required: true,
		type: String,
		enum: {
			values: Object.keys(SalesEnum.Status),
			message: '{VALUE} is not supported',
		},
	})
	status: SalesEnum.Status;

	@Prop({ required: true, type: Date })
	createdAt: Date;

	@Prop({ required: true, type: Date })
	updatedAt: Date;
}

export const SaleSchema = SchemaFactory.createForClass(Sale);
