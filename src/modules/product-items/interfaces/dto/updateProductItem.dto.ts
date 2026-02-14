import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { CreateProductItemDimensionsDto } from './createProductItem.dto';

export default class UpdateProductItemDto {
	@IsString()
	@IsNotEmpty()
	productItemId: string;

	@IsString()
	@IsOptional()
	barcode: string | null;

	@IsString()
	@IsOptional()
	sku: string | null;

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

	isDefault: boolean;

	storeIds: string[];

	@IsString()
	@IsOptional()
	QRCode: string | null;

	@IsString()
	@IsOptional()
	brand: string | null;

	deletedFilesUrl: string[];

	categoriesIds: string[];

	tagsIds: string[];

	@IsOptional()
	releaseDate: Date | null;

	@IsOptional()
	expirationDate: Date | null;

	dimensions: CreateProductItemDimensionsDto | null;

	colors: string[] | null;
}
