import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export default class RecoverPasswordDto {
	@IsString()
	@IsNotEmpty()
	@IsEmail()
	email: string;

	@IsString()
	@IsNotEmpty()
	newPassword: string;

	@IsString()
	@IsNotEmpty()
	codeValue: string;
}
