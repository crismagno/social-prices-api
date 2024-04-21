import { ICreatedAtEntity } from '../../../shared/interfaces/created-at.interface';
import { IUpdatedAtEntity } from '../../../shared/interfaces/updated-at.interface';
import CodesEnum from './codes.enum';

export interface ICodeEntity extends ICreatedAtEntity, IUpdatedAtEntity {
	userId: string;
	value: string;
	type: CodesEnum.Type;
	expiresIn: Date;
}
