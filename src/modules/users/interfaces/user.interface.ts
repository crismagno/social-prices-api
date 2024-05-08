import { Document } from 'mongoose';

import { IAddress } from '../../../shared/interfaces/address.interface';
import {
  ICreatedAtEntity,
} from '../../../shared/interfaces/created-at.interface';
import { IPhoneNumber } from '../../../shared/interfaces/phone-number';
import {
  IUpdatedAtEntity,
} from '../../../shared/interfaces/updated-at.interface';
import UsersEnum from './users.enum';

export interface IUser extends Document, ICreatedAtEntity, IUpdatedAtEntity {
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
	name: string | null;
	birthDate: Date | null;
	addresses: IAddress[] | null;
	gender: UsersEnum.Gender | null;
	about: string | null;
}
