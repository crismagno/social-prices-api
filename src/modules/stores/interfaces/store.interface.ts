import mongoose from 'mongoose';

import { IAddress } from '../../../shared/common/address/address.interface';
import { ICreatedAtEntity } from '../../../shared/common/global/created-at.interface';
import { IUpdatedAtEntity } from '../../../shared/common/global/updated-at.interface';
import { IPhoneNumber } from '../../../shared/common/phone/phone-number.interface';
import { ISoftDeleteEntity } from '../../../shared/common/soft-delete/soft-delete.interface';
import StoresEnum from './stores.enum';

export interface IStore
	extends ISoftDeleteEntity,
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
	tagsIds: mongoose.Schema.Types.ObjectId[];
}
