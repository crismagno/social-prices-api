import TransactionsEnum from './interfaces/transactions.enum';
import {
	ITransactionSummary,
	TTransactionGranularity,
} from './interfaces/transactions.types';

const round2 = (value: number): number => Math.round(value * 100) / 100;

export interface ITotalsRow {
	_id: string;
	total: number;
}

export interface ICategoryRow {
	_id: string | null;
	total: number;
}

export interface IPeriodRow {
	_id: { period: string; type: string };
	total: number;
}

export const PERIOD_FORMATS: Record<TTransactionGranularity, string> = {
	day: '%Y-%m-%d',
	month: '%Y-%m',
};

// `$dateToString` throws on an unknown zone, so anything that is not a real
// IANA zone falls back to UTC instead of turning into a 500.
export const resolveTimezone = (timezone?: string): string => {
	if (!timezone) {
		return 'UTC';
	}

	try {
		new Intl.DateTimeFormat('en', { timeZone: timezone });

		return timezone;
	} catch {
		return 'UTC';
	}
};

export const shapeSummary = (
	totalsRows: ITotalsRow[],
	categoryRows: ICategoryRow[],
	periodRows: IPeriodRow[],
): ITransactionSummary => {
	const totalOf = (type: TransactionsEnum.Type): number =>
		round2(totalsRows.find((row) => row._id === type)?.total ?? 0);

	const income: number = totalOf(TransactionsEnum.Type.INCOME);
	const expense: number = totalOf(TransactionsEnum.Type.EXPENSE);

	const expensesByCategory = categoryRows
		.map((row) => ({
			categoryId:
				row._id === null || row._id === undefined ? null : String(row._id),
			total: round2(row.total),
		}))
		.sort((a, b) => b.total - a.total);

	const periods: Map<string, { income: number; expense: number }> = new Map();

	for (const row of periodRows) {
		const entry = periods.get(row._id.period) ?? { income: 0, expense: 0 };

		if (row._id.type === TransactionsEnum.Type.INCOME) {
			entry.income = round2(entry.income + row.total);
		} else {
			entry.expense = round2(entry.expense + row.total);
		}

		periods.set(row._id.period, entry);
	}

	const byPeriod = [...periods.entries()]
		.map(([period, values]) => ({ period, ...values }))
		.sort((a, b) => a.period.localeCompare(b.period));

	return {
		totals: { income, expense, balance: round2(income - expense) },
		expensesByCategory,
		byPeriod,
	};
};
