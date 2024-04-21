import { IAddress } from '../../../shared/interfaces/address.interface';
import { ICreatedAtEntity } from '../../../shared/interfaces/created-at.interface';
import { IPhoneNumber } from '../../../shared/interfaces/phone-number';
import { IUpdatedAtEntity } from '../../../shared/interfaces/updated-at.interface';
import UsersEnum from './users.enum';

export interface IUserEntity extends ICreatedAtEntity, IUpdatedAtEntity {
	_id: string;
	uid: string;
	email: string;
	username: string;
	avatar: string | null;
	authToken: string | null;
	authProvider: UsersEnum.Provider;
	phoneNumbers: IPhoneNumber[];
	status: UsersEnum.Status;
	extraDataProvider: any | null;
	firstName: string | null;
	lastName: string | null;
	middleName: string | null;
	birthDate: Date | null;
	addresses: IAddress[] | null;
	gender: UsersEnum.Gender | null;
	about: string | null;
}
