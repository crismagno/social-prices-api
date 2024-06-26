import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export default class CreateProductDto {
	@IsString()
	@IsNotEmpty()
	name: string;

	@IsString()
	@IsOptional()
	barCode: string | null;

	@IsString()
	@IsOptional()
	details: string | null;

	quantity: number;

	@IsString()
	@IsOptional()
	description: string | null;

	price: number;

	isActive: boolean;

	storeIds: string[];

	@IsString()
	@IsOptional()
	QRCode: string | null;

	categoriesIds: string[];
}
