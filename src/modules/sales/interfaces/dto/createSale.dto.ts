import { Type } from 'class-transformer';
import {
	IsArray,
	IsDate,
	IsEnum,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsString,
	ValidateNested,
} from 'class-validator';

import { CreateAddressDto } from '../../../../shared/dtos/CreateAddress.dto';
import { CreatePhoneNumberDto } from '../../../../shared/dtos/CreatePhoneNumber.dto';
import UsersEnum from '../../../users/interfaces/users.enum';
import SalesEnum from '../sales.enum';

export class SaleStoreProductDto {
	@IsString()
	@IsNotEmpty()
	productId: string;

	@IsNumber()
	price: number;

	@IsNumber()
	quantity: number;

	@IsString()
	@IsNotEmpty()
	barCode: string;

	@IsString()
	@IsOptional()
	note: string | null;
}

export class SaleTotalsDiscountDto {
	@IsNumber()
	normal: number;
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
	subtotalAmount: number;

	@Type(() => SaleTotalsDiscountDto)
	@IsOptional()
	discount: SaleTotalsDiscountDto | null;

	@IsOptional()
	@IsNumber()
	taxAmount: number | null;

	@IsOptional()
	@IsNumber()
	shippingAmount: number | null;

	@IsNumber()
	totalFinalAmount: number;
}

export class SaleHeaderBillingDto {
	@Type(() => CreateAddressDto)
	@IsOptional()
	address: CreateAddressDto | null;
}

export class SaleHeaderShippingDto {
	@Type(() => CreateAddressDto)
	@IsOptional()
	address: CreateAddressDto | null;
}

export class SaleHeaderDto {
	@Type(() => SaleHeaderBillingDto)
	@IsOptional()
	billing: SaleHeaderBillingDto | null;

	@Type(() => SaleHeaderShippingDto)
	@IsOptional()
	shipping: SaleHeaderShippingDto | null;

	@IsEnum(SalesEnum.DeliveryType)
	deliveryType: SalesEnum.DeliveryType;
}

export class SaleBuyerDto {
	@IsString()
	@IsOptional()
	userId: string | null;

	@IsString()
	@IsNotEmpty()
	email: string;

	@IsString()
	@IsNotEmpty()
	name: string;

	@IsString()
	@IsDate()
	birthDate: Date | null;

	@IsString()
	@IsOptional()
	@IsEnum(UsersEnum.Gender)
	gender: UsersEnum.Gender | null;

	@Type(() => CreatePhoneNumberDto)
	@IsOptional()
	phoneNumber: CreatePhoneNumberDto | null;

	@Type(() => CreateAddressDto)
	@IsOptional()
	address: CreateAddressDto | null;
}

export class SaleStoreDto {
	@IsString()
	@IsNotEmpty()
	storeId: string;

	@IsString()
	@IsNotEmpty()
	number: string;

	@IsString()
	@IsOptional()
	customerId: string;

	@IsArray()
	@Type(() => SaleStoreProductDto)
	@ValidateNested({ each: true })
	products: SaleStoreProductDto[];

	@Type(() => SaleTotalsDto)
	totals: SaleTotalsDto;
}

export default class CreateSaleDto {
	@IsString()
	@IsOptional()
	description: string | null;

	@IsString()
	@IsNotEmpty()
	createdByUserId: string;

	@Type(() => SaleBuyerDto)
	@IsOptional()
	buyer: SaleBuyerDto | null;

	@IsString()
	@IsNotEmpty()
	number: string;

	@IsEnum(SalesEnum.Type)
	type: SalesEnum.Type;

	@Type(() => SaleTotalsDto)
	totals: SaleTotalsDto;

	@Type(() => SaleHeaderDto)
	@IsOptional()
	header: SaleHeaderDto | null;

	@IsString()
	@IsOptional()
	note: string | null;

	@IsEnum(SalesEnum.Status)
	status: SalesEnum.Status;

	@IsArray()
	@Type(() => SalePaymentDto)
	@ValidateNested({ each: true })
	payments: SalePaymentDto[];

	@IsArray()
	@Type(() => SaleStoreDto)
	@ValidateNested({ each: true })
	stores: SaleStoreDto[];
}
