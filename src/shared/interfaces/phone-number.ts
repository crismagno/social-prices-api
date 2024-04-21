import PhoneNumberEnum from '../enums/phone-number.enum';

export interface IPhoneNumber {
	uid: string;
	type: PhoneNumberEnum.PhoneTypes;
	number: string;
	messengers: PhoneNumberEnum.PhoneNumberMessenger[];
}
