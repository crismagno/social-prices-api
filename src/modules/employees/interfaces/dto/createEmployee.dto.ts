import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import PersonEnum from '../../../../shared/enums/person.enum';
import EmployeeEnum from '../employee.enum';

export default class CreateEmployeeDto {
	@IsString()
	@IsNotEmpty()
	userId: string;

	@IsString()
	@IsOptional()
	avatar: string | undefined;

	@IsString()
	@IsNotEmpty()
	name: string;

	@IsString()
	@IsNotEmpty()
	email: string;

	@IsString()
	@IsNotEmpty()
	password: string;

	@IsOptional()
	birthDate: Date | null;

	@IsOptional()
	@IsEnum(PersonEnum.Gender)
	gender: PersonEnum.Gender | null;

	@IsEnum(EmployeeEnum.Level)
	level: EmployeeEnum.Level;

	addresses: any[];

	phoneNumbers: any[];

	tagsIds: string[];

	@IsOptional()
	@IsString()
	about: string | null;

	@IsOptional()
	@IsString()
	username: string | null;

	@IsEnum(EmployeeEnum.Status)
	@IsOptional()
	status: EmployeeEnum.Status | null;
}
