import {
	IsArray,
	IsDateString,
	IsEnum,
	IsNotEmpty,
	IsOptional,
	IsString,
	MaxLength,
} from 'class-validator';

import NotesEnum from '../notes.enum';

export default class CreateNoteDto {
	@IsString()
	@IsNotEmpty()
	@MaxLength(200)
	title: string;

	@IsString()
	@IsNotEmpty()
	@MaxLength(4000)
	text: string;

	@IsDateString()
	date: string;

	@IsOptional()
	@IsString()
	@MaxLength(20)
	color?: string | null;

	@IsEnum(NotesEnum.Status)
	status: NotesEnum.Status;

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	tagsIds?: string[];

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	categoriesIds?: string[];

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	customerIds?: string[];

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	saleIds?: string[];

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	storeIds?: string[];
}
