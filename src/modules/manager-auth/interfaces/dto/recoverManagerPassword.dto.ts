import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export default class RecoverManagerPasswordDto {
	@IsEmail()
	@IsNotEmpty()
	email: string;

	@IsString()
	@IsNotEmpty()
	codeValue: string;

	@IsString()
	@IsNotEmpty()
	newPassword: string;
}
