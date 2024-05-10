import AddressEnum from '../enums/address.enum';

export interface IAddress {
	address1: string;
	address2: string | null;
	city: string;
	isValid: boolean;
	state: IAddressState | null;
	uid: string;
	zip: string;
	description: string | null;
	country: IAddressCountry;
	district: string;
	types: AddressEnum.Type[];
}

export interface IAddressState {
	code: string;
	name: string;
}

export interface IAddressCountry {
	code: string;
	name: string;
}
