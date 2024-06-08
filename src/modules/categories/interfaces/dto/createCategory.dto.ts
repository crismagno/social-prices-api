import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import CategoriesEnum from '../categories.enum';

export default class CreateCategoryDto {
	@IsString()
	@IsNotEmpty()
	name: string;

	@IsString()
	@IsEnum(CategoriesEnum.Type)
	type: CategoriesEnum.Type;

	@IsString()
	@IsNotEmpty()
	code: string;

	@IsString()
	@IsOptional()
	ownerUserId: string | null;

	@IsString()
	@IsOptional()
	description: string | null;
}
