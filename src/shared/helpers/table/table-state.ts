import { QueryOptions } from 'mongoose';

import {
	ITableStateRequest,
	TTableStateSortOrder,
} from './table-state.interface';

export function queryOptions<T>(
	tableStateRequest: ITableStateRequest<T>,
): QueryOptions<T> {
	const options: QueryOptions<T> = {};

	const tableStateRequestSortField: keyof T | 'createdAt' =
		tableStateRequest?.sort?.field ?? 'createdAt';

	const tableStateRequestSortOrder: TTableStateSortOrder =
		tableStateRequest?.sort?.order ?? 'ascend';

	options.sort = {
		[tableStateRequestSortField]:
			tableStateRequestSortOrder === 'ascend' ? 1 : -1,
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
