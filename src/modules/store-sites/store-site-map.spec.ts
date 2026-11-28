import { siteMapOf } from './store-site-map';

describe('siteMapOf', () => {
	it('is an empty map with its usual measures when nothing was stored', () => {
		expect(siteMapOf(undefined)).toEqual({
			height: 420,
			isAutoFit: true,
			centerLat: 0,
			centerLng: 0,
			zoom: 12,
			pins: [],
		});
	});

	it('keeps only pins that are somewhere on Earth, each with its own key', () => {
		const { pins } = siteMapOf({
			pins: [
				{ key: 'a', lat: -23.5505123456, lng: -46.6333, label: ' Shop ' },
				{ key: 'a', lat: 10, lng: 20 },
				{ key: 'far', lat: 95, lng: 20 },
				{ key: 'nowhere', lat: 'x', lng: 20 },
				{ lat: 1, lng: 999 },
			],
		});

		expect(pins).toHaveLength(2);
		expect(pins[0]).toEqual({
			key: 'a',
			lat: -23.550512,
			lng: -46.6333,
			label: 'Shop',
			description: null,
			color: null,
		});
		expect(pins[1].key).not.toBe('a');
	});

	it('keeps the height and the zoom in range, and a plain colour', () => {
		const map = siteMapOf({
			height: 5000,
			zoom: 40,
			isAutoFit: false,
			centerLat: -10.5,
			centerLng: 300,
			pins: [
				{ lat: 1, lng: 1, color: 'red; x: url(evil)' },
				{ lat: 2, lng: 2, color: '#FF0055' },
			],
		});

		expect(map).toMatchObject({
			height: 900,
			zoom: 18,
			isAutoFit: false,
			centerLat: -10.5,
			centerLng: 0,
		});
		expect(map.pins.map((pin) => pin.color)).toEqual([null, '#FF0055']);
	});

	it('takes no more pins than a map may have', () => {
		const pins = Array.from({ length: 90 }, (_, index) => ({
			lat: index / 10,
			lng: index / 10,
		}));

		expect(siteMapOf({ pins }).pins).toHaveLength(60);
	});
});
