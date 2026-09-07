import mongoose from 'mongoose';

import { IAddress } from '../../../shared/common/address/address.interface';
import { ICreatedAtEntity } from '../../../shared/common/global/created-at.interface';
import { IUpdatedAtEntity } from '../../../shared/common/global/updated-at.interface';
import PersonEnum from '../../../shared/common/person/person.enum';
import { IPhoneNumber } from '../../../shared/common/phone/phone-number.interface';
import EmployeesEnum from './employees.enum';

export interface IEmployee extends ICreatedAtEntity, IUpdatedAtEntity {
	readonly _id: string;
	userId: mongoose.Schema.Types.ObjectId;
	avatar: string | null;
	name: string;
	username: string;
	email: string;
	password: string;
	birthDate: Date | null;
	gender: PersonEnum.Gender | null;
	addresses: IAddress[];
	phoneNumbers: IPhoneNumber[];
	tagsIds: mongoose.Schema.Types.ObjectId[];
	about: string | null;
	level: EmployeesEnum.Level;
	status: EmployeesEnum.Status;
	isMain: boolean;
	uploadFilename: string | null;
}
