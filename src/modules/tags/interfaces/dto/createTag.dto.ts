import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import TagsEnum from '../tags.enum';

export default class CreateTagDto {
	@IsString()
	@IsNotEmpty()
	userId: string;

	@IsString()
	@IsNotEmpty()
	name: string;

	@IsString()
	@IsOptional()
	description: string | null;

	@IsString()
	@IsEnum(TagsEnum.Type)
	type: TagsEnum.Type;

	@IsString()
	@IsOptional()
	color: string | null;
}
