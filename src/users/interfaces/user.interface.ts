import { Document } from 'mongoose';

export interface IUser extends Document {
	uid: any;
	username: string;
	password: string;
}
