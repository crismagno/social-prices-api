import mongoose from 'mongoose';

import { ICreatedAtEntity } from '../../shared/interfaces/created-at.interface';
import {
  ISoftDeleteEntity,
} from '../../shared/interfaces/soft-delete.interface';
import { IUpdatedAtEntity } from '../../shared/interfaces/updated-at.interface';
import StoresEnum from './stores.enum';

export interface IStore
	extends Document,
		ISoftDeleteEntity,
		ICreatedAtEntity,
		IUpdatedAtEntity {
	readonly _id: string;
	logo: string | null;
	email: string;
	name: string;
	description: string | null;
	startedAt: Date;
	status: StoresEnum.Status;
	userId: mongoose.Schema.Types.ObjectId;
	addresses: IStoreAddress[];
	phoneNumbers: IStorePhoneNumber[];
	about: string | null;
}

export interface IStorePhoneNumber {
	uid: string;
	type: StoresEnum.PhoneTypes;
	number: string;
	messengers: StoresEnum.PhoneNumberMessenger[];
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

export interface IStoreRemoved {
	description: string | null;
	removedAt: Date;
}
