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

export class SaleTotalsDiscountDto {
	@IsNumber()
	normal: number;
}

export class SaleStoreTotalsDto {
	@IsOptional()
	@Type(() => SaleTotalsDiscountDto)
	discount: SaleTotalsDiscountDto | null;

	@IsNumber()
	@IsOptional()
	tax: number | null;

	@IsNumber()
	@IsOptional()
	shipping: number | null;
}

export class SaleStoreDto {
	@IsString()
	storeId: string;

	@IsArray()
	products: SaleStoreProductDto[];

	@Type(() => SaleStoreTotalsDto)
	totals: SaleStoreTotalsDto;
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

export class SaleTotalsDto {
	@IsNumber()
	subtotal: number;

	@Type(() => SaleTotalsDiscountDto)
	@IsOptional()
	discount: SaleTotalsDiscountDto | null;

	@IsOptional()
	@IsNumber()
	tax: number | null;

	@IsOptional()
	@IsNumber()
	shipping: number | null;

	@IsNumber()
	totalFinal: number;
}

export class SaleHeaderDto {
	@Type(() => SaleTotalsDto)
	@IsOptional()
	billingAddress: CreateAddressDto | null;

	@Type(() => SaleTotalsDto)
	@IsOptional()
	shippingAddress: CreateAddressDto | null;
}

export default class CreateSaleDto {
	@IsString()
	@IsOptional()
	description: string | null;

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
	@IsOptional()
	header: SaleHeaderDto | null;

	@IsEnum(SalesEnum.Status)
	status: SalesEnum.Status;
}
