import { parseYearRange, yearRangeLabel } from './product-year-range';

describe('parseYearRange', () => {
	it('is none for a product saved or sent without years', () => {
		expect(parseYearRange(undefined)).toBeNull();
		expect(parseYearRange(null)).toBeNull();
		expect(parseYearRange('')).toBeNull();
		expect(parseYearRange({})).toBeNull();
		expect(parseYearRange({ from: null, to: null })).toBeNull();
		expect(parseYearRange([2015, 2018])).toBeNull();
		expect(parseYearRange(2015)).toBeNull();
	});

	it('keeps the first and the last year', () => {
		expect(parseYearRange({ from: 2015, to: 2018 })).toEqual({
			from: 2015,
			to: 2018,
		});
	});

	it('takes them as the text a form with files sends', () => {
		expect(parseYearRange('{"from":2015,"to":2018}')).toEqual({
			from: 2015,
			to: 2018,
		});
		expect(parseYearRange('{"from":"2015","to":" 2018 "}')).toEqual({
			from: 2015,
			to: 2018,
		});
		expect(parseYearRange('not json')).toBeNull();
		expect(parseYearRange('null')).toBeNull();
	});

	it('leaves an end open when only the other was given', () => {
		expect(parseYearRange({ from: 2015 })).toEqual({ from: 2015, to: null });
		expect(parseYearRange({ to: 2018 })).toEqual({ from: null, to: 2018 });
		expect(parseYearRange({ from: 2015, to: '' })).toEqual({
			from: 2015,
			to: null,
		});
	});

	it('puts the years in order when they came the other way round', () => {
		expect(parseYearRange({ from: 2020, to: 2015 })).toEqual({
			from: 2015,
			to: 2020,
		});
	});

	it('leaves out what cannot be a year', () => {
		expect(parseYearRange({ from: 2015.5, to: 2018 })).toEqual({
			from: null,
			to: 2018,
		});
		expect(parseYearRange({ from: 15, to: 99999 })).toBeNull();
		expect(parseYearRange({ from: 'abc', to: true })).toBeNull();
		expect(parseYearRange({ from: 0, to: 0 })).toBeNull();
	});
});

describe('yearRangeLabel', () => {
	it('says the years as they read', () => {
		expect(yearRangeLabel({ from: 2015, to: 2018 })).toBe('2015–2018');
		expect(yearRangeLabel({ from: 2015, to: 2015 })).toBe('2015');
		expect(yearRangeLabel({ from: 2015, to: null })).toBe('2015+');
		expect(yearRangeLabel({ from: null, to: 2018 })).toBe('–2018');
		expect(yearRangeLabel(null)).toBe('');
		expect(yearRangeLabel({ from: null, to: null })).toBe('');
	});
});
