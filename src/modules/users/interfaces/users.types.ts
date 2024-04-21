import { ICreatedAtEntity } from '../../../shared/interfaces/created-at.interface';
import { IUpdatedAtEntity } from '../../../shared/interfaces/updated-at.interface';
import { IPhoneNumber, IUserAddress } from './user.interface';
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
	addresses: IUserAddress[] | null;
	gender: UsersEnum.Gender | null;
	about: string | null;
}
