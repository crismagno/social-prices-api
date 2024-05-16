import { Type } from 'class-transformer';
import {
	IsArray,
	IsEnum,
	IsNumber,
	IsOptional,
	IsString,
	ValidateNested,
} from 'class-validator';

import { CreateAddressDto } from '../../../../shared/dtos/CreateAddress.dto';
import SalesEnum from '../sales.enum';

export class SaleStoreProductDto {
	@IsString()
	productId: string;

	@IsNumber()
	price: number;

	@IsNumber()
	quantity: number;

	@IsString()
	barCode: string;

	@IsString()
	@IsOptional()
	note: string | null;
}

export class SaleStoreDto {
	@IsString()
	storeId: string;

	@IsArray()
	products: SaleStoreProductDto[];
}

export class SalePaymentDto {
	@IsEnum(SalesEnum.PaymentType)
	type: SalesEnum.PaymentType;

	@IsEnum(SalesEnum.PaymentStatus)
	status: SalesEnum.PaymentStatus;

	@IsNumber()
	amount: number;

	@IsOptional()
	provider: any | null;
}

export class SaleTotalsDiscountDto {
	@IsNumber()
	normal: number;
}

export class SaleTotalsDto {
	@IsNumber()
	subtotal: number;

	@Type(() => SaleTotalsDiscountDto)
	discount: SaleTotalsDiscountDto | null;

	@IsNumber()
	tax: number;

	@IsNumber()
	shipping: number;

	@IsNumber()
	totalFinal: number;
}

export class SaleHeaderDto {
	@Type(() => SaleTotalsDto)
	billingAddress: CreateAddressDto;

	@Type(() => SaleTotalsDto)
	shippingAddress: CreateAddressDto;
}

export default class CreateSaleDto {
	@IsString()
	@IsOptional()
	description: string | null;

	@IsString()
	ownerUserId: string;

	@IsString()
	createdByUserId: string;

	@IsString()
	customerId: string;

	@IsArray()
	@Type(() => SaleStoreDto)
	@ValidateNested({ each: true })
	stores: SaleStoreDto[];

	@IsString()
	number: string;

	@IsEnum(SalesEnum.Type)
	type: SalesEnum.Type;

	@IsArray()
	@Type(() => SalePaymentDto)
	@ValidateNested({ each: true })
	payments: SalePaymentDto[];

	@Type(() => SaleTotalsDto)
	totals: SaleTotalsDto;

	@IsString()
	@IsOptional()
	note: string | null;

	@Type(() => SaleHeaderDto)
	header: SaleHeaderDto;

	@IsEnum(SalesEnum.Status)
	status: SalesEnum.Status;
}
