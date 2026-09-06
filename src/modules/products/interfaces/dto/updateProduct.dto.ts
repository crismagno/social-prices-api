import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { IDynamicField } from '../../../../shared/common/dynamic-field/dynamic-field.interface';

import { CreateProductDimensionsDto } from './createProduct.dto';

export default class UpdateProductDto {
	@IsString()
	@IsNotEmpty()
	productId: string;

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

	dimensions: CreateProductDimensionsDto | null;

	colors: string[] | null;

	@IsOptional()
	dynamicFields: IDynamicField[] | string | null;
}
