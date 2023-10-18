import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export default class UpdateUserDto {
	@IsString()
	@IsNotEmpty()
	firstName: string;

	@IsString()
	@IsNotEmpty()
	lastName: string;

	@IsString()
	@IsOptional()
	middleName: string | null;

	@IsNotEmpty()
	birthDate: any;

	@IsString()
	@IsOptional()
	gender: string | null;
}
