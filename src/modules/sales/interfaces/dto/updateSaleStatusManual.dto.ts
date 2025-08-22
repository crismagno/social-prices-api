import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

import SalesEnum from '../sales.enum';

export default class UpdateSaleStatusManualDto {
	@IsString()
	@IsNotEmpty()
	saleId: string;

	@IsEnum(SalesEnum.Status)
	@IsNotEmpty()
	newStatus: SalesEnum.Status;
}
