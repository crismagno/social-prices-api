import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

import UserEnum from '../user.enum';

export default class CreateUserDto {
	@IsString()
	@IsNotEmpty()
	@IsEmail()
	email: string;

	@IsString()
	@IsNotEmpty()
	password: string;

	@IsString()
	@IsOptional()
	username: string;

	@IsString()
	@IsOptional()
	uid: string | null;

	@IsString()
	@IsOptional()
	@IsEnum(UserEnum.Provider)
	authProvider: UserEnum.Provider | null;

	@IsString()
	@IsOptional()
	avatar: string | null;

	@IsOptional()
	@IsArray()
	phoneNumbers: string[] | null;

	@IsOptional()
	extraDataProvider: any | null;
}
