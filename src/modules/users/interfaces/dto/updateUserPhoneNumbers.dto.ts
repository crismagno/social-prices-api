import { IsArray } from 'class-validator';

import { IPhoneNumber } from '../user.interface';

export default class UpdateUserPhoneNumbersDto {
	@IsArray()
	phoneNumbers: IPhoneNumber[];
}
