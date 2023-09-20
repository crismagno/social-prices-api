import { Document } from 'mongoose';

import UsersEnum from './users.enum';

export interface IUser extends Document {
	uid: string;
	email: string;
	username: string;
	password: string;
	avatar: string | null;
	authToken: string | null;
	authProvider: UsersEnum.Provider;
	phoneNumbers: string[];
	extraDataProvider: any | null;
	status: UsersEnum.Status;
}
