import { Document } from 'mongoose';

import UserEnum from './user.enum';

export interface IUser extends Document {
	uid: string;
	email: string;
	username: string;
	password: string;
	avatar: string | null;
	authToken: string | null;
	authProvider: UserEnum.Provider;
	phoneNumbers: string[];
	extraDataProvider: any | null;
	status: UserEnum.Status;
}
