import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';

export default class CompleteMultipleSalesManualDto {
	@IsArray()
	@Type(() => String)
	@ValidateNested({ each: true })
	saleIds: string[];
}
