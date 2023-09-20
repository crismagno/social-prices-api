import UsersEnum from './users.enum';

export interface IUserEntity {
	email: string;
	username: string;
	avatar: string | null;
	authToken: string | null;
	authProvider: UsersEnum.Provider;
	phoneNumbers: string[];
	status: UsersEnum.Status;
	extraDataProvider: any | null;
}
