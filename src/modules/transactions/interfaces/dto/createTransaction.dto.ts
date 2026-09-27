import {
	IsArray,
	IsDateString,
	IsEnum,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsPositive,
	IsString,
	MaxLength,
} from 'class-validator';

import TransactionsEnum from '../transactions.enum';

export default class CreateTransactionDto {
	@IsString()
	@IsNotEmpty()
	@MaxLength(200)
	name: string;

	@IsEnum(TransactionsEnum.Type)
	type: TransactionsEnum.Type;

	@IsNumber({ maxDecimalPlaces: 2 })
	@IsPositive()
	value: number;

	@IsEnum(TransactionsEnum.Status)
	status: TransactionsEnum.Status;

	@IsOptional()
	@IsString()
	@MaxLength(2000)
	note?: string | null;

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	tagsIds?: string[];

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	categoriesIds?: string[];

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	storeIds?: string[];

	@IsOptional()
	@IsDateString()
	createdDate?: string | null;
}
