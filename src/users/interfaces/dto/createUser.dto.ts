import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

import UsersEnum from '../users.enum';

export default class CreateUserDto {
	@IsString()
	@IsNotEmpty()
	@IsEmail()
	email: string;

	@IsString()
	@IsNotEmpty()
	password: string;

	@IsString()
	@IsNotEmpty()
	username: string;

	@IsString()
	@IsOptional()
	uid: string | null;

	@IsString()
	@IsOptional()
	@IsEnum(UsersEnum.Provider)
	authProvider: UsersEnum.Provider | null;

	@IsString()
	@IsOptional()
	avatar: string | null;

	@IsOptional()
	@IsArray()
	phoneNumbers: string[] | null;

	@IsOptional()
	extraDataProvider: any | null;
}
