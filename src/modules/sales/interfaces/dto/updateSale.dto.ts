import { Type } from 'class-transformer';
import {
	IsArray,
	IsBoolean,
	IsEnum,
	IsNotEmpty,
	IsOptional,
	IsString,
	ValidateNested,
} from 'class-validator';

import SalesEnum from '../sales.enum';
import {
	SaleBuyerDto,
	SaleHeaderDto,
	SalePaymentDto,
	SaleStoreDto,
	SaleTotalsDto,
} from './createSale.dto';

export default class UpdateSaleDto {
	@IsString()
	@IsNotEmpty()
	saleId: string;

	@IsString()
	@IsNotEmpty()
	updatedByUserId: string;

	@IsString()
	@IsNotEmpty()
	updatedByEmployeeId: string;

	@Type(() => SaleBuyerDto)
	@IsOptional()
	buyer: SaleBuyerDto | null;

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

	@IsEnum(SalesEnum.PaymentStatus)
	paymentStatus: SalesEnum.PaymentStatus;

	@IsArray()
	@Type(() => SalePaymentDto)
	@ValidateNested({ each: true })
	payments: SalePaymentDto[];

	@IsArray()
	@Type(() => SaleStoreDto)
	@ValidateNested({ each: true })
	stores: SaleStoreDto[];

	@IsArray()
	@Type(() => String)
	tagsIds: string[];

	@IsArray()
	@IsOptional()
	categoriesIds: string[];

	@IsString()
	@IsOptional()
	deliveryAt: Date | null;

	@IsString()
	@IsOptional()
	createdDate: Date | null;

	@IsString()
	@IsOptional()
	numberManual: string | null;

	@IsString()
	@IsOptional()
	noteToCustomer: string | null;

	@IsBoolean()
	isSendCustomerNotifications: boolean;
}
