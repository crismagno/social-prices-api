import { SITE_SIZE_KEYS, siteSizesOf } from './store-site-sizes';

describe('siteSizesOf', () => {
	it('answers every known size, empty when nothing was set', () => {
		const sizes = siteSizesOf(undefined);

		expect(Object.keys(sizes).sort()).toEqual([...SITE_SIZE_KEYS].sort());
		expect(Object.values(sizes).every((value) => value === null)).toBe(true);
	});

	it('keeps what is in range, as whole pixels', () => {
		expect(
			siteSizesOf({ logoWidth: 64, heroTitleSize: 72.6, heroHeight: '640' }),
		).toMatchObject({ logoWidth: 64, heroTitleSize: 73, heroHeight: 640 });
	});

	it('pulls a size back into what a page can take', () => {
		expect(
			siteSizesOf({
				logoWidth: 1,
				featuredImageWidth: 99999,
				heroTitleSize: 2,
				productNameSize: 9000,
				heroHeight: 5,
			}),
		).toMatchObject({
			logoWidth: 16,
			featuredImageWidth: 1600,
			heroTitleSize: 8,
			productNameSize: 200,
			heroHeight: 120,
		});
	});

	it('treats anything that is not a number as not set', () => {
		expect(
			siteSizesOf({
				logoWidth: 'big',
				logoHeight: null,
				heroHeight: NaN,
				heroTitleSize: '',
				sectionTextSize: { $gt: 1 },
			}),
		).toMatchObject({
			logoWidth: null,
			logoHeight: null,
			heroHeight: null,
			heroTitleSize: null,
			sectionTextSize: null,
		});
	});

	it('takes a width and a height for the name at the top, besides its letters', () => {
		expect(
			siteSizesOf({
				brandNameWidth: 220,
				brandNameHeight: 48,
				brandNameSize: 28,
			}),
		).toMatchObject({
			brandNameWidth: 220,
			brandNameHeight: 48,
			brandNameSize: 28,
		});
	});

	it('drops sizes nobody knows', () => {
		expect(
			siteSizesOf({ logoWidth: 40, hack: 10, __proto__: { x: 1 } }),
		).not.toHaveProperty('hack');
	});

	it('survives garbage instead of an object', () => {
		expect(siteSizesOf('nope').logoWidth).toBeNull();
		expect(siteSizesOf([1, 2]).logoWidth).toBeNull();
	});
});
