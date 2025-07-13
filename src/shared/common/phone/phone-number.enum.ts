namespace PhoneNumberEnum {
	export enum Type {
		MOBILE = 'MOBILE',
		HOME = 'HOME',
		BUSINESS = 'BUSINESS',
		OTHER = 'OTHER',
	}

	export enum PhoneNumberMessenger {
		WHATSAPP = 'WHATSAPP',
		TELEGRAM = 'TELEGRAM',
		MESSENGER = 'MESSENGER',
		OTHER = 'OTHER',
	}

	export const TypeLabels = {
		[Type.MOBILE]: 'Mobile',
		[Type.HOME]: 'Home',
		[Type.BUSINESS]: 'Business',
		[Type.OTHER]: 'Other',
	};

	export const PhoneNumberMessengerLabels = {
		[PhoneNumberMessenger.WHATSAPP]: 'Whatsapp',
		[PhoneNumberMessenger.TELEGRAM]: 'Telegram',
		[PhoneNumberMessenger.MESSENGER]: 'Messenger',
		[PhoneNumberMessenger.OTHER]: 'Other',
	};
}

export default PhoneNumberEnum;
