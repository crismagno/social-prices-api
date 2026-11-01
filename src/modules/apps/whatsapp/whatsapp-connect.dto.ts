import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** What Embedded Signup hands the browser when the user finishes. */
export class ConnectWhatsappDto {
	@IsString()
	@IsNotEmpty()
	@MaxLength(2000)
	code: string;

	@IsString()
	@IsNotEmpty()
	@MaxLength(64)
	wabaId: string;

	@IsString()
	@IsNotEmpty()
	@MaxLength(64)
	phoneNumberId: string;
}
