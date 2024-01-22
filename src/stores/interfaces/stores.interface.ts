import mongoose from 'mongoose';

import StoresEnum from './stores.enum';

export interface IStore extends Document {
	readonly _id: string;
	logo: string | null;
	email: string;
	name: string;
	description: string | null;
	startedAt: Date;
	createdAt: Date;
	updatedAt: Date;
	status: StoresEnum.Status;
	userId: mongoose.Schema.Types.ObjectId;
	addresses: IStoreAddress[];
	phoneNumbers: IStorePhoneNumber[];
}

export interface IStorePhoneNumber {
	uid: string;
	number: string;
}

export interface IStoreAddress {
	address1: string;
	address2?: string;
	city: string;
	isValid: boolean;
	state?: IStoreAddressState;
	uid: string;
	zip: string;
	description?: string;
	country: IStoreAddressCountry;
	district: string;
}

export interface IStoreAddressState {
	code: string;
	name: string;
}

export interface IStoreAddressCountry {
	code: string;
	name: string;
}
