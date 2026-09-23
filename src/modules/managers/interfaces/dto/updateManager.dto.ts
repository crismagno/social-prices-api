import {
	IsBoolean,
	IsEnum,
	IsNotEmpty,
	IsOptional,
	IsString,
} from 'class-validator';

import ManagersEnum from '../managers.enum';

export default class UpdateManagerDto {
	@IsString()
	@IsNotEmpty()
	_id: string;

	@IsString()
	@IsNotEmpty()
	name: string;

	@IsOptional()
	birthDate: Date | null;

	@IsEnum(ManagersEnum.Level)
	level: ManagersEnum.Level;

	@IsBoolean()
	isActive: boolean;
}
