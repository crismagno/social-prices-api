import NotesEnum from './interfaces/notes.enum';
import { buildNoteFilter } from './notes-filter';

const USER_ID: string = '507f1f77bcf86cd799439011';

describe('buildNoteFilter', () => {
	it('always scopes the query by the user', () => {
		const filter: any = buildNoteFilter(USER_ID, {});

		expect(filter.userId.toString()).toBe(USER_ID);
	});

	it('searches title and text with the text escaped', () => {
		const filter: any = buildNoteFilter(USER_ID, { search: 'a.b (x)' });

		expect(filter.$or.map((c: any) => Object.keys(c)[0])).toEqual([
			'title',
			'text',
		]);
		expect(filter.$or[0].title.test('see a.b (x) here')).toBe(true);
		expect(filter.$or[0].title.test('see axb x here')).toBe(false);
	});

	it('ignores a blank search', () => {
		expect(buildNoteFilter(USER_ID, { search: '   ' }).$or).toBeUndefined();
	});

	it('filters by status with $in', () => {
		const filter: any = buildNoteFilter(USER_ID, {
			filters: {
				status: [NotesEnum.Status.PENDING, NotesEnum.Status.COMPLETED],
			},
		});

		expect(filter.status).toEqual({ $in: ['PENDING', 'COMPLETED'] });
	});

	it('filters by date range', () => {
		const filter: any = buildNoteFilter(USER_ID, {
			filters: {
				rangeDate: {
					startDate: '2026-09-01T00:00:00.000Z',
					endDate: '2026-09-30T23:59:59.999Z',
				},
			},
		});

		expect(filter.date.$gte).toEqual(new Date('2026-09-01T00:00:00.000Z'));
		expect(filter.date.$lte).toEqual(new Date('2026-09-30T23:59:59.999Z'));
	});

	it('ignores an invalid date range', () => {
		expect(
			buildNoteFilter(USER_ID, {
				filters: { rangeDate: { startDate: 'not a date', endDate: null } },
			}).date,
		).toBeUndefined();
	});

	it('filters by tag, category, customer, sale and store ids with $in', () => {
		const filter: any = buildNoteFilter(USER_ID, {
			filters: {
				tagsIds: ['t1'],
				categoriesIds: ['c1'],
				customerIds: ['cu1'],
				saleIds: ['s1'],
				storeIds: ['st1'],
			},
		});

		expect(filter.tagsIds).toEqual({ $in: ['t1'] });
		expect(filter.categoriesIds).toEqual({ $in: ['c1'] });
		expect(filter.customerIds).toEqual({ $in: ['cu1'] });
		expect(filter.saleIds).toEqual({ $in: ['s1'] });
		expect(filter.storeIds).toEqual({ $in: ['st1'] });
	});

	it('ignores empty id arrays', () => {
		const filter: any = buildNoteFilter(USER_ID, {
			filters: { tagsIds: [], storeIds: [] },
		});

		expect(filter.tagsIds).toBeUndefined();
		expect(filter.storeIds).toBeUndefined();
	});
});
