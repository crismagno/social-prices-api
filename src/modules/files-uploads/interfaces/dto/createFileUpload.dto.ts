import { Type } from 'class-transformer';
import {
	IsArray,
	IsEnum,
	IsNotEmpty,
	IsString,
	ValidateNested,
} from 'class-validator';

import FilesUploadsEnum from '../files-uploads.enum';

export default class CreateFileUploadDto {
	@IsString()
	@IsNotEmpty()
	userId: string;

	@IsString()
	@IsNotEmpty()
	employeeId: string;

	@IsArray()
	@Type(() => String)
	@ValidateNested({ each: true })
	filenames: string[];

	@IsEnum(FilesUploadsEnum.Type)
	@IsNotEmpty()
	type: FilesUploadsEnum.Type;
}
