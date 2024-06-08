import { IsArray, IsEnum, IsString } from 'class-validator';

import PhoneNumberEnum from '../enums/phone-number.enum';

export class CreatePhoneNumberDto {
	@IsString()
	uid: string;

	@IsEnum(PhoneNumberEnum.Type)
	type: PhoneNumberEnum.Type;

	@IsArray()
	@IsEnum(PhoneNumberEnum.PhoneNumberMessenger)
	messengers: PhoneNumberEnum.PhoneNumberMessenger[];

	@IsString()
	number: string;
}
