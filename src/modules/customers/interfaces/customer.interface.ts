import mongoose from 'mongoose';

import PersonEnum from '../../../shared/enums/person.enum';
import { IAddress } from '../../../shared/interfaces/address.interface';
import { ICreatedAtEntity } from '../../../shared/interfaces/created-at.interface';
import { IPhoneNumber } from '../../../shared/interfaces/phone-number.interface';
import { IUpdatedAtEntity } from '../../../shared/interfaces/updated-at.interface';

export interface ICustomer extends ICreatedAtEntity, IUpdatedAtEntity {
	readonly _id: string;
	avatar: string | null;
	userId: mongoose.Schema.Types.ObjectId | null;
	email: string | null;
	ownerUserId: mongoose.Schema.Types.ObjectId;
	name: string | null;
	birthDate: Date | null;
	addresses: IAddress[];
	gender: PersonEnum.Gender | null;
	about: string | null;
	phoneNumbers: IPhoneNumber[];
	tagsIds: mongoose.Schema.Types.ObjectId[];
	uniqName: string | null;
}
