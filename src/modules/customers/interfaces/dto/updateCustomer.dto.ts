import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import UsersEnum from '../../../users/interfaces/users.enum';

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

	@IsOptional()
	birthDate: Date | null;

	@IsString()
	@IsOptional()
	@IsEnum(UsersEnum.Gender)
	gender: UsersEnum.Gender | null;

	@IsString()
	@IsOptional()
	about: string | null;

	addresses: any[];

	phoneNumbers: any[];
}
