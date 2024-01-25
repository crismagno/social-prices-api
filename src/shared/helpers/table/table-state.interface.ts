export type TTableStateSortOrder = 'asc' | 'desc';

export interface ITableStateRequest<T> {
	search?: string;
	sortField?: keyof T;
	sortOrder?: TTableStateSortOrder;
}

export interface ITableStateResponse<T> {
	total: number;
	data: T;
}
