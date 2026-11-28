import { catalogFilterOf } from './store-site-catalog-filter';

const ALL_ON = {
	TEXT: true,
	SORT: true,
	PRICE: true,
	AVAILABILITY: true,
	BRAND: true,
	COLOR: true,
	SIZE: true,
	DIMENSIONS: true,
	YEAR: true,
};

describe('catalogFilterOf', () => {
	it('is off, on the left and complete for a site saved before it', () => {
		expect(catalogFilterOf(undefined)).toEqual({
			isShown: false,
			side: 'LEFT',
			title: null,
			fields: ALL_ON,
			colors: { background: null, text: null, accent: null },
		});
	});

	it('keeps the side, the title, the fields turned off and plain colours', () => {
		expect(
			catalogFilterOf({
				isShown: true,
				side: 'RIGHT',
				title: '  Find yours  ',
				fields: { BRAND: false, COLOR: 'no', nope: false },
				colors: {
					background: '#101010',
					text: 'red; x: url(evil)',
					accent: '#FF0055',
				},
			}),
		).toEqual({
			isShown: true,
			side: 'RIGHT',
			title: 'Find yours',
			fields: { ...ALL_ON, BRAND: false },
			colors: { background: '#101010', text: null, accent: '#FF0055' },
		});
	});

	it('takes an unknown side for the left and cuts a long title', () => {
		const filter = catalogFilterOf({ side: 'TOP', title: 'x'.repeat(90) });

		expect(filter.side).toBe('LEFT');
		expect(filter.title).toHaveLength(40);
	});
});
