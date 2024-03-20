import CodesEnum from './codes.enum';

export interface ICodeEntity {
	userId: string;
	value: string;
	type: CodesEnum.Type;
	expiresIn: Date;
}
