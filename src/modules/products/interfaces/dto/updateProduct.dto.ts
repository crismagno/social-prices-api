import { IsOptional, IsString } from 'class-validator';

export default class UpdateProductDto {
	@IsString()
	productId: string;

	@IsString()
	@IsOptional()
	barCode: string | null;

	@IsString()
	@IsOptional()
	details: string | null;

	@IsString()
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
