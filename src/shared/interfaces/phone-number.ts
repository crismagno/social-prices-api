import PhoneNumberEnum from '../enums/phone-number.enum';

export interface IPhoneNumber {
	uid: string;
	type: PhoneNumberEnum.Type;
	number: string;
	messengers: PhoneNumberEnum.PhoneNumberMessenger[];
}
