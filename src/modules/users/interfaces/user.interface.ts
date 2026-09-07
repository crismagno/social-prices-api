import { Document } from 'mongoose';

import { IAddress } from '../../../shared/common/address/address.interface';
import { ICreatedAtEntity } from '../../../shared/common/global/created-at.interface';
import { IUpdatedAtEntity } from '../../../shared/common/global/updated-at.interface';
import PersonEnum from '../../../shared/common/person/person.enum';
import { IPhoneNumber } from '../../../shared/common/phone/phone-number.interface';
import { ISoftDeleteEntity } from '../../../shared/common/soft-delete/soft-delete.interface';
import UsersEnum from './users.enum';

export interface IUser extends Document, ICreatedAtEntity, IUpdatedAtEntity, ISoftDeleteEntity {
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
	gender: PersonEnum.Gender | null;
	about: string | null;
	type: UsersEnum.Type;
}
