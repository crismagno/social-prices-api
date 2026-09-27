import { resolveTimezone, shapeSummary } from './transactions-summary';

describe('shapeSummary', () => {
	it('computes totals and balance, rounded to 2 decimals', () => {
		const summary = shapeSummary(
			[
				{ _id: 'INCOME', total: 100.1 },
				{ _id: 'EXPENSE', total: 0.2 + 0.1 },
			],
			[],
			[],
		);

		expect(summary.totals).toEqual({
			income: 100.1,
			expense: 0.3,
			balance: 99.8,
		});
	});

	it('gives zeros when there is no data and a negative balance when expenses win', () => {
		expect(shapeSummary([], [], []).totals).toEqual({
			income: 0,
			expense: 0,
			balance: 0,
		});
		expect(
			shapeSummary([{ _id: 'EXPENSE', total: 30 }], [], []).totals.balance,
		).toBe(-30);
	});

	it('maps categories: null id stays null, ids become strings, ordered by total desc', () => {
		const summary = shapeSummary(
			[],
			[
				{ _id: 'c1', total: 10 },
				{ _id: null, total: 50.005 },
				{ _id: 'c2', total: 20 },
			],
			[],
		);

		expect(summary.expensesByCategory).toEqual([
			{ categoryId: null, total: 50.01 },
			{ categoryId: 'c2', total: 20 },
			{ categoryId: 'c1', total: 10 },
		]);
	});

	it('merges income and expense rows of the same period, ordered by period', () => {
		const summary = shapeSummary(
			[],
			[],
			[
				{ _id: { period: '2026-10', type: 'EXPENSE' }, total: 5 },
				{ _id: { period: '2026-09', type: 'INCOME' }, total: 100 },
				{ _id: { period: '2026-10', type: 'INCOME' }, total: 40 },
			],
		);

		expect(summary.byPeriod).toEqual([
			{ period: '2026-09', income: 100, expense: 0 },
			{ period: '2026-10', income: 40, expense: 5 },
		]);
	});
});

describe('resolveTimezone', () => {
	it('keeps a valid IANA zone', () => {
		expect(resolveTimezone('America/Sao_Paulo')).toBe('America/Sao_Paulo');
	});

	it.each([undefined, '', 'Not/AZone', '../../etc'])(
		'falls back to UTC for %p',
		(value) => {
			expect(resolveTimezone(value as any)).toBe('UTC');
		},
	);
});
