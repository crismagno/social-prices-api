import { ICreatedAtEntity } from '../../../shared/interfaces/created-at.interface';
import { IUpdatedAtEntity } from '../../../shared/interfaces/updated-at.interface';
import CountersEnum from './counters.enum';

export interface ICounter extends ICreatedAtEntity, IUpdatedAtEntity {
	readonly _id: string;
	count: number;
	type: CountersEnum.Type;
}
