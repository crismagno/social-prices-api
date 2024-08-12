import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import EmployeeEnum from '../employee.enum';

export default class UpdateEmployeeDto {
	@IsString()
	@IsNotEmpty()
	employeeId: string;

	@IsString()
	@IsNotEmpty()
	name: string;

	@IsString()
	@IsNotEmpty()
	email: string;

	@IsString()
	@IsOptional()
	password: string | null;

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
}
