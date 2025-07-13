import { IsArray } from 'class-validator';

import { IPhoneNumber } from '../../../../shared/common/phone/phone-number.interface';

export default class UpdateUserPhoneNumbersDto {
	@IsArray()
	phoneNumbers: IPhoneNumber[];
}
