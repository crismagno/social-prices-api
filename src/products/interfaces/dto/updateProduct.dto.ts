import {
	IsArray,
	IsBoolean,
	IsNumber,
	IsOptional,
	IsString,
	Min,
} from 'class-validator';

export default class UpdateProductDto {
	@IsString()
	productId: string;

	@IsString()
	name: string;

	@IsNumber()
	@Min(0)
	@Min(1000000)
	quantity: number;

	@IsString()
	@IsOptional()
	description: string | null;

	@IsNumber()
	@Min(0)
	price: number;

	@IsBoolean()
	isActive: boolean;

	@IsArray()
	storeIds: string[];
}
