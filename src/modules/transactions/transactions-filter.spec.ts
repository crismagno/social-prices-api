import TransactionsEnum from './interfaces/transactions.enum';
import { buildTransactionFilter } from './transactions-filter';

const USER_ID: string = '507f1f77bcf86cd799439011';

describe('buildTransactionFilter', () => {
	it('always scopes the query by the user', () => {
		const filter: any = buildTransactionFilter(USER_ID, {});

		expect(filter.userId.toString()).toBe(USER_ID);
	});

	it('searches name and note with the text escaped', () => {
		const filter: any = buildTransactionFilter(USER_ID, { search: 'a.b (x)' });

		expect(filter.$or.map((c: any) => Object.keys(c)[0])).toEqual([
			'name',
			'note',
		]);
		expect(filter.$or[0].name.test('see a.b (x) here')).toBe(true);
		expect(filter.$or[0].name.test('see axb x here')).toBe(false);
	});

	it('ignores a blank search', () => {
		expect(
			buildTransactionFilter(USER_ID, { search: '   ' }).$or,
		).toBeUndefined();
	});

	it('filters by type and status with $in', () => {
		const filter: any = buildTransactionFilter(USER_ID, {
			filters: {
				type: [TransactionsEnum.Type.EXPENSE],
				status: [
					TransactionsEnum.Status.COMPLETED,
					TransactionsEnum.Status.PENDING,
				],
			},
		});

		expect(filter.type).toEqual({ $in: ['EXPENSE'] });
		expect(filter.status).toEqual({ $in: ['COMPLETED', 'PENDING'] });
	});

	it('leaves CANCELED in by default', () => {
		expect(buildTransactionFilter(USER_ID, {}).status).toBeUndefined();
	});

	it('excludes CANCELED by default only when asked and no status filter is set', () => {
		expect(
			buildTransactionFilter(USER_ID, {}, { excludeCanceledByDefault: true })
				.status,
		).toEqual({ $ne: 'CANCELED' });

		const explicit: any = buildTransactionFilter(
			USER_ID,
			{ filters: { status: [TransactionsEnum.Status.CANCELED] } },
			{ excludeCanceledByDefault: true },
		);

		expect(explicit.status).toEqual({ $in: ['CANCELED'] });
	});

	it('filters by a value range, accepting only one side', () => {
		expect(
			(
				buildTransactionFilter(USER_ID, {
					filters: { value: { min: 10, max: 50 } },
				}) as any
			).value,
		).toEqual({ $gte: 10, $lte: 50 });
		expect(
			(
				buildTransactionFilter(USER_ID, {
					filters: { value: { min: 10 } },
				}) as any
			).value,
		).toEqual({ $gte: 10 });
	});

	it('filters by createdDate range', () => {
		const filter: any = buildTransactionFilter(USER_ID, {
			filters: {
				rangeDate: {
					startDate: '2026-09-01T00:00:00.000Z',
					endDate: '2026-09-30T23:59:59.999Z',
				},
			},
		});

		expect(filter.createdDate.$gte).toEqual(
			new Date('2026-09-01T00:00:00.000Z'),
		);
		expect(filter.createdDate.$lte).toEqual(
			new Date('2026-09-30T23:59:59.999Z'),
		);
	});

	it('filters by store, tag and category ids with $in', () => {
		const filter: any = buildTransactionFilter(USER_ID, {
			filters: {
				storeIds: ['s1'],
				tagsIds: ['t1', 't2'],
				categoriesIds: ['c1'],
			},
		});

		expect(filter.storeIds).toEqual({ $in: ['s1'] });
		expect(filter.tagsIds).toEqual({ $in: ['t1', 't2'] });
		expect(filter.categoriesIds).toEqual({ $in: ['c1'] });
	});

	it('ignores empty arrays, non numeric values and invalid dates', () => {
		const filter: any = buildTransactionFilter(USER_ID, {
			filters: {
				type: [],
				storeIds: [],
				value: { min: 'abc' as any, max: null },
				rangeDate: { startDate: 'not a date', endDate: null },
			},
		});

		expect(filter.type).toBeUndefined();
		expect(filter.storeIds).toBeUndefined();
		expect(filter.value).toBeUndefined();
		expect(filter.createdDate).toBeUndefined();
	});
});
