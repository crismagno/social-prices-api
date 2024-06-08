import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';

import CreateCategoryDto from './createCategory.dto';

export default class CreateCategoryMultiDto {
	@IsArray()
	@Type(() => CreateCategoryDto)
	@ValidateNested({ each: true })
	categories: CreateCategoryDto[];
}
