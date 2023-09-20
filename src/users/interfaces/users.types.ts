import UserEnum from './user.enum';

export interface IUserEntity {
	email: string;
	username: string;
	avatar: string | null;
	authToken: string | null;
	authProvider: UserEnum.Provider;
	phoneNumbers: string[];
	status: UserEnum.Status;
	extraDataProvider: any | null;
}
