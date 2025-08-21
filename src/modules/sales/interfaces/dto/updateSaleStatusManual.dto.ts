import { IsEnum, IsNotEmpty } from 'class-validator';

import SalesEnum from '../sales.enum';

export default class UpdateSaleStatusManualDto {
	@IsEnum(SalesEnum.Status)
	@IsNotEmpty()
	newStatus: SalesEnum.Status;
}
