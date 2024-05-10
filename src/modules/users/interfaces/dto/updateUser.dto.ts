import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

import UsersEnum from '../users.enum';

export default class UpdateUserDto {
	@IsString()
	@IsNotEmpty()
	name: string;

	@IsNotEmpty()
	birthDate: any;

	@IsString()
	@IsOptional()
	@IsEnum(UsersEnum.Gender)
	gender: UsersEnum.Gender | null;

	@IsString()
	@IsOptional()
	about: string | null;
}
