import { ICreatedAtEntity } from '../../../shared/common/global/created-at.interface';
import { IUpdatedAtEntity } from '../../../shared/common/global/updated-at.interface';
import CountersEnum from './counters.enum';

export interface ICounter extends ICreatedAtEntity, IUpdatedAtEntity {
	readonly _id: string;
	count: number;
	type: CountersEnum.Type;
}
