import { IPhoneNumber, IUserAddress } from './user.interface';
import UsersEnum from './users.enum';

export interface IUserEntity {
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
}
