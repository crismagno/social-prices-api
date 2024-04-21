import { IsArray } from 'class-validator';

import { IPhoneNumber } from '../../../../shared/interfaces/phone-number';

export default class UpdateUserPhoneNumbersDto {
	@IsArray()
	phoneNumbers: IPhoneNumber[];
}
