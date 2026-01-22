import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateProductDimensionsDto {
	@IsString()
	@IsOptional()
	size: string | null;

	@IsOptional()
	height: number | null;

	@IsOptional()
	width: number | null;

	@IsOptional()
	length: number | null;

	@IsOptional()
	depth: number | null;

	@IsOptional()
	diameter: number | null;

	@IsOptional()
	thickness: number | null;

	@IsOptional()
	volume: number | null;

	@IsOptional()
	weight: number | null;
}

export default class CreateProductDto {
	@IsString()
	@IsNotEmpty()
	name: string;

	@IsString()
	@IsOptional()
	barcode: string | null;

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

	@IsString()
	@IsOptional()
	brand: string | null;

	categoriesIds: string[];

	tagsIds: string[];

	@IsOptional()
	releaseDate: Date | null;

	dimensions: CreateProductDimensionsDto | null;

	colors: string[] | null;
}
