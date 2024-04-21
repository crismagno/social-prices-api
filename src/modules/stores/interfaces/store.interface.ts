import mongoose from 'mongoose';

import { IAddress } from '../../../shared/interfaces/address.interface';
import { ICreatedAtEntity } from '../../../shared/interfaces/created-at.interface';
import { IPhoneNumber } from '../../../shared/interfaces/phone-number';
import { ISoftDeleteEntity } from '../../../shared/interfaces/soft-delete.interface';
import { IUpdatedAtEntity } from '../../../shared/interfaces/updated-at.interface';
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
	addresses: IAddress[];
	phoneNumbers: IPhoneNumber[];
	about: string | null;
	categoriesIds: mongoose.Schema.Types.ObjectId[];
}
