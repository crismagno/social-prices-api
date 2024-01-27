namespace UsersEnum {
	export enum Provider {
		GOOGLE = 'GOOGLE',
		SOCIAL_PRICES = 'SOCIAL_PRICES',
	}

	export enum Status {
		PENDING = 'PENDING',
		ACTIVE = 'ACTIVE',
		STOPPED = 'STOPPED',
	}

	export enum Gender {
		FEMALE = 'FEMALE',
		MALE = 'MALE',
		OTHER = 'OTHER',
	}

	export enum PhoneTypes {
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
}

export default UsersEnum;
