import { IAddress } from '../../../shared/common/address/address.interface';
import { ICreatedAtEntity } from '../../../shared/common/global/created-at.interface';
import { IUpdatedAtEntity } from '../../../shared/common/global/updated-at.interface';
import PersonEnum from '../../../shared/common/person/person.enum';
import { IPhoneNumber } from '../../../shared/common/phone/phone-number.interface';
import UsersEnum from './users.enum';

export interface IUserEntity extends ICreatedAtEntity, IUpdatedAtEntity {
	_id: string;
	uid: string;
	email: string;
	username: string;
	avatar: string | null;
	authProvider: UsersEnum.Provider;
	phoneNumbers: IPhoneNumber[];
	status: UsersEnum.Status;
	extraDataProvider: any | null;
	name: string | null;
	birthDate: Date | null;
	addresses: IAddress[] | null;
	gender: PersonEnum.Gender | null;
	about: string | null;
	type: UsersEnum.Type;
}
