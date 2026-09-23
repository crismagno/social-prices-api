import AuthEnum from '../../auth/interfaces/auth.enum';
import ManagersEnum from '../../managers/interfaces/managers.enum';
import { IManagerEntity } from '../../managers/interfaces/managers.types';

export interface IManagerAuthPayload {
	_id: string;
	email: string;
	level: ManagersEnum.Level;
	isMain: boolean;
	type: AuthEnum.PayloadType.MANAGER;
	isSignInValidated: boolean;
	iat?: number;
	exp?: number;
}

export interface IManagerAuthLogin {
	manager: IManagerEntity;
	authToken: string;
}
