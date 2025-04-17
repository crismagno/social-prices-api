import mongoose from 'mongoose';

import PersonEnum from '../../../shared/enums/person.enum';
import { IAddress } from '../../../shared/interfaces/address.interface';
import { ICreatedAtEntity } from '../../../shared/interfaces/created-at.interface';
import { IPhoneNumber } from '../../../shared/interfaces/phone-number.interface';
import { IUpdatedAtEntity } from '../../../shared/interfaces/updated-at.interface';
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
