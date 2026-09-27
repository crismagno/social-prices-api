import { shapeCalendarMarkers } from './notes-calendar';

describe('shapeCalendarMarkers', () => {
	it('splits counts by status per day', () => {
		const markers = shapeCalendarMarkers([
			{ _id: { date: '2026-09-05', status: 'PENDING' }, count: 2, colors: [] },
			{
				_id: { date: '2026-09-05', status: 'COMPLETED' },
				count: 1,
				colors: [],
			},
			{
				_id: { date: '2026-09-06', status: 'CANCELLED' },
				count: 3,
				colors: [],
			},
		]);

		expect(markers).toEqual([
			{
				date: '2026-09-05',
				pending: 2,
				completed: 1,
				cancelled: 0,
				colors: [],
			},
			{
				date: '2026-09-06',
				pending: 0,
				completed: 0,
				cancelled: 3,
				colors: [],
			},
		]);
	});

	it('returns an empty array for no rows', () => {
		expect(shapeCalendarMarkers([])).toEqual([]);
	});

	it('orders by date', () => {
		const markers = shapeCalendarMarkers([
			{ _id: { date: '2026-09-10', status: 'PENDING' }, count: 1, colors: [] },
			{ _id: { date: '2026-09-02', status: 'PENDING' }, count: 1, colors: [] },
		]);

		expect(markers.map((marker) => marker.date)).toEqual([
			'2026-09-02',
			'2026-09-10',
		]);
	});

	it('collects distinct, non-null colors across statuses of the same day', () => {
		const markers = shapeCalendarMarkers([
			{
				_id: { date: '2026-09-05', status: 'PENDING' },
				count: 1,
				colors: ['#ff0000', null],
			},
			{
				_id: { date: '2026-09-05', status: 'COMPLETED' },
				count: 1,
				colors: ['#ff0000', '#00ff00'],
			},
		]);

		expect(markers[0].colors.sort()).toEqual(['#00ff00', '#ff0000']);
	});

	it('leaves colors empty when every note that day has none', () => {
		const markers = shapeCalendarMarkers([
			{
				_id: { date: '2026-09-05', status: 'PENDING' },
				count: 1,
				colors: [null],
			},
		]);

		expect(markers[0].colors).toEqual([]);
	});
});
