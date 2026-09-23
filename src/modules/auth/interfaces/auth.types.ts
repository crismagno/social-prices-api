import { IEmployee } from '../../employees/interfaces/employee.interface';
import { IUserEntity } from '../../users/interfaces/users.types';
import AuthEnum from './auth.enum';

export interface IAuthPayload {
	_id: string;
	uid: string;
	email: string;
	iat?: number;
	exp?: number;
	employeeId?: string;
	type?: AuthEnum.PayloadType.USER;
}

/**
 * The narrow view of a decoded token that AuthGuard itself needs. Deliberately
 * structural: the guard decides identity from these two fields alone and knows
 * nothing about the rest of either payload shape. Typing the decode this way
 * makes a typo in either field name a compile error.
 */
export interface IDecodedTokenPayload {
	type?: AuthEnum.PayloadType;
	isSignInValidated?: boolean;
}

export interface IAuthLogin {
	user: IUserEntity;
	employee: IEmployee;
	authToken: string;
}

export interface IAuthUserEmployee {
	user: IUserEntity;
	employee: IEmployee;
}
