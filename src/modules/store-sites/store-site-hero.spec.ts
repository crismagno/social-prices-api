import { heroSlidesOf } from './store-site-hero';

describe('heroSlidesOf', () => {
	it('has no extra images and six seconds each for a site saved before the slider', () => {
		expect(heroSlidesOf(undefined)).toEqual({
			backgroundImageUrls: [],
			slideSeconds: 6,
		});
		expect(heroSlidesOf({ backgroundImageUrl: 'a.png' })).toEqual({
			backgroundImageUrls: [],
			slideSeconds: 6,
		});
	});

	it('keeps the extra images in order, without blanks or repeats of the first', () => {
		expect(
			heroSlidesOf({
				backgroundImageUrl: 'a.png',
				backgroundImageUrls: ['b.png', ' ', 'a.png', 'c.png', 'b.png', 7, null],
			}).backgroundImageUrls,
		).toEqual(['b.png', 'c.png']);
	});

	it('keeps at most five extra images', () => {
		expect(
			heroSlidesOf({
				backgroundImageUrls: ['1', '2', '3', '4', '5', '6', '7'],
			}).backgroundImageUrls,
		).toEqual(['1', '2', '3', '4', '5']);
	});

	it('keeps the time of each image between three and twenty seconds', () => {
		expect(heroSlidesOf({ slideSeconds: 10 }).slideSeconds).toBe(10);
		expect(heroSlidesOf({ slideSeconds: 0 }).slideSeconds).toBe(3);
		expect(heroSlidesOf({ slideSeconds: 999 }).slideSeconds).toBe(20);
		expect(heroSlidesOf({ slideSeconds: 'fast' }).slideSeconds).toBe(6);
		expect(heroSlidesOf({ slideSeconds: 7.6 }).slideSeconds).toBe(8);
	});

	it('survives garbage', () => {
		expect(
			heroSlidesOf({ backgroundImageUrls: 'x' }).backgroundImageUrls,
		).toEqual([]);
		expect(heroSlidesOf('x').backgroundImageUrls).toEqual([]);
	});
});
