import { Document } from 'mongoose';

import UsersEnum from './users.enum';

export interface IUser extends Document {
	readonly _id: string;
	uid: string;
	email: string;
	username: string;
	password: string;
	avatar: string | null;
	authToken: string | null;
	authProvider: UsersEnum.Provider;
	phoneNumbers: IPhoneNumber[];
	extraDataProvider: any | null;
	status: UsersEnum.Status;
	firstName: string | null;
	lastName: string | null;
	middleName: string | null;
	birthDate: Date | null;
	addresses: IUserAddress[] | null;
	gender: UsersEnum.Gender | null;
	about: string | null;
}

export interface IPhoneNumber {
	uid: string;
	type: UsersEnum.PhoneTypes;
	number: string;
	messengers: UsersEnum.PhoneNumberMessenger[];
}

export interface IUserAddress {
	address1: string;
	address2?: string;
	city: string;
	isValid: boolean;
	state?: IUserAddressState;
	uid: string;
	zip: string;
	description?: string;
	country: IUserAddressCountry;
	district: string;
}

export interface IUserAddressState {
	code: string;
	name: string;
}

export interface IUserAddressCountry {
	code: string;
	name: string;
}
