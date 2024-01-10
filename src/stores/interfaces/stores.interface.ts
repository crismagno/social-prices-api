import StoresEnum from './stores.enum';

export interface IStore extends Document {
	logo: string;
	email: string;
	name: string;
	description: string;
	startedAt: Date;
	createdAt: Date;
	updatedAt: Date;
	status: StoresEnum.Status;
	userId: string;
}
