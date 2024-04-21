export interface IAddress {
	address1: string;
	address2?: string;
	city: string;
	isValid: boolean;
	state?: IAddressState;
	uid: string;
	zip: string;
	description?: string;
	country: IAddressCountry;
	district: string;
}

export interface IAddressState {
	code: string;
	name: string;
}

export interface IAddressCountry {
	code: string;
	name: string;
}
