import { IsArray } from 'class-validator';

import CreateCategoryDto from './createCategory.dto';

export default class CreateCategoryMultiDto {
	@IsArray()
	categories: CreateCategoryDto[];
}
