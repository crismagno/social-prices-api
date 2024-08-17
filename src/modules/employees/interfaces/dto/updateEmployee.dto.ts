import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import PersonEnum from '../../../../shared/enums/person.enum';
import EmployeesEnum from '../employees.enum';

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
	@IsEnum(PersonEnum.Gender)
	gender: PersonEnum.Gender | null;

	@IsEnum(EmployeesEnum.Level)
	level: EmployeesEnum.Level;

	addresses: any[];

	phoneNumbers: any[];

	tagsIds: string[];

	@IsOptional()
	about: string | null;
}
