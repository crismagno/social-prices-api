import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import PersonEnum from '../../../../shared/enums/person.enum';

export default class UpdateCustomerDto {
	@IsString()
	@IsNotEmpty()
	customerId: string;

	@IsString()
	@IsOptional()
	email: string | null;

	@IsString()
	@IsOptional()
	name: string | null;

	@IsString()
	@IsOptional()
	uniqName: string | null;

	@IsOptional()
	birthDate: Date | null;

	@IsString()
	@IsOptional()
	@IsEnum(PersonEnum.Gender)
	gender: PersonEnum.Gender | null;

	@IsString()
	@IsOptional()
	about: string | null;

	addresses: any[];

	phoneNumbers: any[];

	tagsIds: string[];
}
