export interface IAuthPayload {
	_id: string;
	uid: string;
	email: string;
	iat?: number;
	exp?: number;
}
