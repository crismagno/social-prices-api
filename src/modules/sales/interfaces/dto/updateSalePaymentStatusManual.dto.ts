import { Type } from 'class-transformer';
import {
	IsArray,
	IsEnum,
	IsNotEmpty,
	IsString,
	ValidateNested,
} from 'class-validator';

import SalesEnum from '../sales.enum';
import { SalePaymentDto } from './createSale.dto';

export default class UpdateSalePaymentStatusManualDto {
	@IsString()
	@IsNotEmpty()
	saleId: string;

	@IsEnum(SalesEnum.PaymentStatus)
	@IsNotEmpty()
	newPaymentStatus: SalesEnum.PaymentStatus;

	@IsArray()
	@Type(() => SalePaymentDto)
	@ValidateNested({ each: true })
	newPayments: SalePaymentDto[];
}
