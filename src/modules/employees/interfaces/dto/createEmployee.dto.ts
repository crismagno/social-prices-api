import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import EmployeeEnum from '../employee.enum';

export default class CreateEmployeeDto {
	@IsString()
	@IsNotEmpty()
	userId: string;

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
	@IsEnum(EmployeeEnum.Gender)
	gender: EmployeeEnum.Gender | null;

	@IsEnum(EmployeeEnum.Level)
	level: EmployeeEnum.Level;

	addresses: any[];

	phoneNumbers: any[];

	tagsIds: string[];

	@IsOptional()
	about: string | null;

	@IsEnum(EmployeeEnum.Status)
	@IsOptional()
	status: EmployeeEnum.Status | null;
}
