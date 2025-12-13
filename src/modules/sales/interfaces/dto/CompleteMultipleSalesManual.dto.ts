import { Type } from 'class-transformer';
import { IsArray } from 'class-validator';

export default class CompleteMultipleSalesManualDto {
	@IsArray()
	@Type(() => String)
	saleIds: string[];
}
