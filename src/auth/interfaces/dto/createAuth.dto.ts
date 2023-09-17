import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export default class CreateAuthDto {
	@IsString()
	@IsNotEmpty()
	@IsEmail()
	email: string;

	@IsString()
	@IsNotEmpty()
	username: string;

	@IsString()
	@IsNotEmpty()
	password: string;
}
