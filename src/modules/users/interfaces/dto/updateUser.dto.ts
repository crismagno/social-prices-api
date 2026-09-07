import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import PersonEnum from '../../../../shared/common/person/person.enum';

export default class UpdateUserDto {
	@IsString()
	@IsNotEmpty()
	name: string;

	@IsNotEmpty()
	birthDate: any;

	@IsString()
	@IsOptional()
	@IsEnum(PersonEnum.Gender)
	gender: PersonEnum.Gender | null;

	@IsString()
	@IsOptional()
	about: string | null;
}
