import {
	IsBoolean,
	IsEnum,
	IsNotEmpty,
	IsOptional,
	IsString,
} from 'class-validator';

import PersonEnum from '../../../../shared/enums/person.enum';
import EmployeesEnum from '../employees.enum';

export default class CreateEmployeeDto {
	@IsString()
	@IsOptional()
	avatar: string | null;

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

	@IsEnum(EmployeesEnum.Level)
	level: EmployeesEnum.Level;

	addresses: any[];

	phoneNumbers: any[];

	tagsIds: string[];

	@IsOptional()
	@IsString()
	about: string | null;

	@IsOptional()
	@IsString()
	username: string | null;

	@IsEnum(EmployeesEnum.Status)
	@IsOptional()
	status: EmployeesEnum.Status | null;

	@IsOptional()
	@IsBoolean()
	isMain: boolean | null;
}
