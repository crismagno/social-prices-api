import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';

import CreateTagDto from './createTag.dto';

export default class CreateTagMultiDto {
	@IsArray()
	@Type(() => CreateTagDto)
	@ValidateNested({ each: true })
	tags: CreateTagDto[];
}
