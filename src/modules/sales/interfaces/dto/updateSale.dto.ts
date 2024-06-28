import { Type } from 'class-transformer';
import {
	IsArray,
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
}
