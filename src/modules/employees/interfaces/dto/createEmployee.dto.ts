import { IsEnum, IsOptional, IsString } from 'class-validator';

import UsersEnum from '../../../users/interfaces/users.enum';
import EmployeeEnum from '../employee.enum';

export default class CreateEmployeeDto {
	@IsString()
	@IsOptional()
	userId: string | null;

	@IsString()
	@IsOptional()
	name: string | null;

	@IsString()
	@IsOptional()
	email: string | null;

	@IsString()
	@IsOptional()
	password: string | null;

	@IsOptional()
	birthDate: Date | null;

	@IsOptional()
	@IsEnum(UsersEnum.Gender)
	gender: UsersEnum.Gender | null;

	@IsEnum(EmployeeEnum.Level)
	level: EmployeeEnum.Level;

	addresses: any[];

	phoneNumbers: any[];

	tagsIds: string[];

	@IsOptional()
	about: string | null;
}
