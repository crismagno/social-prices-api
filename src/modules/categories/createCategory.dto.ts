import { IsEnum, IsString } from 'class-validator';

import CategoriesEnum from '../categories.enum';

export default class CreateCategoryDto {
	@IsString()
	name: string;

	@IsString()
	@IsEnum(CategoriesEnum.Type)
	type: CategoriesEnum.Type;

	@IsString()
	code: string;
}
