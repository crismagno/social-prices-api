import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export default class UpdateProductDto {
	@IsString()
	@IsNotEmpty()
	productId: string;

	@IsString()
	@IsOptional()
	barCode: string | null;

	@IsString()
	@IsOptional()
	details: string | null;

	@IsString()
	@IsNotEmpty()
	name: string;

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

	deletedFilesUrl: string[];

	categoriesIds: string[];
}
