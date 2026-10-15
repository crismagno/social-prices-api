import mongoose from 'mongoose';

import AppsEnum from '../../apps/interfaces/apps.enum';
import { IAddress } from '../../../shared/common/address/address.interface';
import { ICreatedAtEntity } from '../../../shared/common/global/created-at.interface';
import { IUpdatedAtEntity } from '../../../shared/common/global/updated-at.interface';
import PersonEnum from '../../../shared/common/person/person.enum';
import { IPhoneNumber } from '../../../shared/common/phone/phone-number.interface';

export interface IExternalSource {
	appId: AppsEnum.App;
	externalId: string;
}

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
	idNumber: string | null;
	cpf: string | null;
	cnpj: string | null;
	phoneNumbers: IPhoneNumber[];
	tagsIds: mongoose.Schema.Types.ObjectId[];
	uniqName: string | null;
	uploadFilename: string | null;
	/** Apps this customer came from or was linked to; one entry per app. */
	externalSources?: IExternalSource[];
}
