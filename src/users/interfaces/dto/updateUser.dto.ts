import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import UsersEnum from '../users.enum';

export default class UpdateUserDto {
	@IsString()
	@IsNotEmpty()
	firstName: string;

	@IsString()
	@IsNotEmpty()
	lastName: string;

	@IsString()
	@IsOptional()
	middleName: string | null;

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
