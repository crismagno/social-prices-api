import mongoose from 'mongoose';

import { IAddress } from '../../../shared/interfaces/address.interface';
import { ICreatedAtEntity } from '../../../shared/interfaces/created-at.interface';
import { IPhoneNumber } from '../../../shared/interfaces/phone-number';
import { IUpdatedAtEntity } from '../../../shared/interfaces/updated-at.interface';
import UsersEnum from '../../users/interfaces/users.enum';
import EmployeeEnum from './employee.enum';

export interface IEmployee extends ICreatedAtEntity, IUpdatedAtEntity {
	readonly _id: string;
	userId: mongoose.Schema.Types.ObjectId;
	avatar: string | null;
	name: string;
	email: string;
	password: string;
	birthDate: Date | null;
	gender: UsersEnum.Gender | null;
	addresses: IAddress[];
	phoneNumbers: IPhoneNumber[];
	tagsIds: mongoose.Schema.Types.ObjectId[];
	about: string | null;
	level: EmployeeEnum.Level;
}
