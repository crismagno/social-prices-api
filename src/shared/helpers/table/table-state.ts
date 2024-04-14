import { QueryOptions } from 'mongoose';

import { ITableStateRequest } from './table-state.interface';

export function queryOptions<T>(
	tableStateRequest: ITableStateRequest<T>,
): QueryOptions<T> {
	const options: QueryOptions<T> = {};

	options.sort = {
		[tableStateRequest?.sort?.field]:
			tableStateRequest?.sort?.order === 'ascend' ? 1 : -1,
	};

	if (tableStateRequest?.pagination?.current) {
		options.skip =
			(tableStateRequest?.pagination?.current - 1) *
			tableStateRequest?.pagination?.pageSize;
	}

	if (tableStateRequest?.pagination?.pageSize) {
		options.limit = tableStateRequest?.pagination?.pageSize;
	}

	return options;
}
