import {
	IsEmail,
	IsEnum,
	IsNotEmpty,
	IsOptional,
	IsString,
} from 'class-validator';

import ManagersEnum from '../managers.enum';

export default class CreateManagerDto {
	@IsString()
	@IsNotEmpty()
	name: string;

	@IsEmail()
	@IsNotEmpty()
	email: string;

	@IsString()
	@IsNotEmpty()
	password: string;

	@IsOptional()
	birthDate: Date | null;

	@IsEnum(ManagersEnum.Level)
	level: ManagersEnum.Level;
}
