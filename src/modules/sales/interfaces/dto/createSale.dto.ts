import { Type } from 'class-transformer';
import {
	IsArray,
	IsDate,
	IsEnum,
	IsNumber,
	IsOptional,
	IsString,
	ValidateNested,
} from 'class-validator';

import { CreateAddressDto } from '../../../../shared/dtos/CreateAddress.dto';
import { IPhoneNumber } from '../../../../shared/interfaces/phone-number';
import UsersEnum from '../../../users/interfaces/users.enum';
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
	email: string;

	@IsString()
	name: string;

	@IsString()
	@IsDate()
	birthDate: Date | null;

	@IsString()
	@IsOptional()
	@IsEnum(UsersEnum.Gender)
	gender: UsersEnum.Gender | null;

	@IsOptional()
	phoneNumber: IPhoneNumber | null;

	@Type(() => CreateAddressDto)
	@IsOptional()
	address: CreateAddressDto | null;
}

export class SaleStoreDto {
	@IsString()
	storeId: string;

	@IsString()
	number: string;

	@IsString()
	@IsOptional()
	customerId: string;

	@IsArray()
	products: SaleStoreProductDto[];

	@Type(() => SaleTotalsDto)
	totals: SaleTotalsDto;
}

export default class CreateSaleDto {
	@IsString()
	@IsOptional()
	description: string | null;

	@IsString()
	createdByUserId: string;

	@Type(() => SaleBuyerDto)
	@IsOptional()
	buyer: SaleBuyerDto | null;

	@IsString()
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
