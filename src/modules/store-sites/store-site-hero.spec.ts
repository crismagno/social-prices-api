import { heroOptionsOf, heroSlidesOf } from './store-site-hero';

describe('heroSlidesOf', () => {
	it('has no extra images and six seconds each for a site saved before the slider', () => {
		const none = {
			backgroundImageUrls: [],
			slideSeconds: 6,
			featuredImageUrls: [],
			featuredSlideSeconds: 6,
		};

		expect(heroSlidesOf(undefined)).toEqual(none);
		expect(heroSlidesOf({ backgroundImageUrl: 'a.png' })).toEqual(none);
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

	describe('featured image', () => {
		it('keeps its own extra images and time, apart from the background', () => {
			expect(
				heroSlidesOf({
					backgroundImageUrl: 'bg.png',
					backgroundImageUrls: ['bg2.png'],
					slideSeconds: 4,
					featuredImageUrl: 'f.png',
					featuredImageUrls: ['f2.png', 'f.png', '', 'f3.png', 'f2.png'],
					featuredSlideSeconds: 12,
				}),
			).toEqual({
				backgroundImageUrls: ['bg2.png'],
				slideSeconds: 4,
				featuredImageUrls: ['f2.png', 'f3.png'],
				featuredSlideSeconds: 12,
			});
		});

		it('keeps at most five extra featured images, and a time in range', () => {
			const slides = heroSlidesOf({
				featuredImageUrls: ['1', '2', '3', '4', '5', '6'],
				featuredSlideSeconds: 1,
			});

			expect(slides.featuredImageUrls).toEqual(['1', '2', '3', '4', '5']);
			expect(slides.featuredSlideSeconds).toBe(3);
		});
	});

	it('survives garbage', () => {
		expect(
			heroSlidesOf({ backgroundImageUrls: 'x' }).backgroundImageUrls,
		).toEqual([]);
		expect(heroSlidesOf('x').backgroundImageUrls).toEqual([]);
	});
});

describe('heroOptionsOf', () => {
	const untouched = {
		isTaglineVisible: true,
		isTitleVisible: true,
		isSubtitleVisible: true,
		isFeaturedVisible: true,
		veil: 100,
		isButtonVisible: true,
		extraText: null,
		button: null,
		secondButton: null,
		colors: { background: null, text: null, button: null },
	};

	it('shows the entrance as it always was for a site saved before the options', () => {
		expect(heroOptionsOf(undefined)).toEqual(untouched);
		expect(heroOptionsOf('x')).toEqual(untouched);
		expect(heroOptionsOf([])).toEqual(untouched);
	});

	it('keeps the pieces the owner hid and the extra paragraph, trimmed and cut', () => {
		const options = heroOptionsOf({
			isTaglineVisible: false,
			isTitleVisible: false,
			isSubtitleVisible: false,
			isFeaturedVisible: false,
			isButtonVisible: false,
			extraText: `  ${'a'.repeat(500)}  `,
		});

		expect(options).toMatchObject({
			isTaglineVisible: false,
			isTitleVisible: false,
			isSubtitleVisible: false,
			isFeaturedVisible: false,
			isButtonVisible: false,
		});
		expect(options.extraText).toHaveLength(400);
	});

	it('keeps only colours that are colours', () => {
		expect(
			heroOptionsOf({
				colors: {
					background: '#AABBCC',
					text: 'red',
					button: 'url(javascript:1)',
				},
			}).colors,
		).toEqual({ background: '#aabbcc', text: null, button: null });
	});

	it('keeps where the main button leads, with or without words of its own', () => {
		expect(
			heroOptionsOf({ button: { target: 'WHATSAPP', value: '85999990000' } })
				.button,
		).toMatchObject({ target: 'WHATSAPP', value: '85999990000' });
	});

	it('has a second button only when it says something', () => {
		expect(
			heroOptionsOf({ secondButton: { target: 'PAGE', pageKey: 'about' } })
				.secondButton,
		).toBeNull();
		expect(
			heroOptionsOf({
				secondButton: { label: ' Fale com a gente ', target: 'PAGE' },
			}).secondButton,
		).toMatchObject({ label: 'Fale com a gente', target: 'PAGE' });
	});
});
