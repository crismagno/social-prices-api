import TransactionsEnum from './transactions.enum';

export type TTransactionGranularity = 'day' | 'month';

export interface ITransactionFilters {
	type?: TransactionsEnum.Type[];
	status?: TransactionsEnum.Status[];
	value?: { min?: number | null; max?: number | null };
	rangeDate?: {
		startDate?: string | Date | null;
		endDate?: string | Date | null;
	};
	storeIds?: string[];
	tagsIds?: string[];
	categoriesIds?: string[];
}

export interface ITransactionSummaryRequest {
	search?: string;
	filters?: ITransactionFilters;
	granularity?: TTransactionGranularity;
	timezone?: string;
}

export interface ITransactionSummary {
	totals: { income: number; expense: number; balance: number };
	expensesByCategory: { categoryId: string | null; total: number }[];
	byPeriod: { period: string; income: number; expense: number }[];
}
