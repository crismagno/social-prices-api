namespace UsersEnum {
	export enum Provider {
		GOOGLE = 'GOOGLE',
		SOCIAL_PRICES = 'SOCIAL_PRICES',
	}

	export enum Status {
		PENDING = 'PENDING',
		ACTIVE = 'ACTIVE',
		STOPPED = 'STOPPED',
		INACTIVE = 'INACTIVE',
	}

	export enum Type {
		COMPANY = 'COMPANY',
		/** Someone who buys from stores: sees only the sales made for them. */
		CUSTOMER = 'CUSTOMER',
	}
}

export default UsersEnum;
