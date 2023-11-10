import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export default class UpdateEmailDto {
	@IsString()
	@IsNotEmpty()
	@IsEmail()
	email: string;

	@IsString()
	@IsNotEmpty()
	newEmail: string;

	@IsString()
	@IsNotEmpty()
	codeValue: string;
}
