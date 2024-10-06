import { IEmployee } from '../../employees/interfaces/employee.interface';
import { IUserEntity } from '../../users/interfaces/users.types';

export interface IAuthPayload {
	_id: string;
	uid: string;
	email: string;
	iat?: number;
	exp?: number;
	employeeId?: string;
}

export interface IAuthLogin {
	user: IUserEntity;
	employee: IEmployee;
	authToken: string;
}
