import { IPhoneNumber } from './user.interface';
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
}
