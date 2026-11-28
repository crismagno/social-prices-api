import { sectionBackgroundOf } from './store-site-section-background';

describe('sectionBackgroundOf', () => {
	it('is nothing when none was chosen and no room was added', () => {
		expect(sectionBackgroundOf(undefined)).toBeNull();
		expect(sectionBackgroundOf({ type: 'NONE', color: '#ffffff' })).toBeNull();
		expect(sectionBackgroundOf({ type: 'wavy' })).toBeNull();
	});

	it('keeps only room, with no background', () => {
		expect(sectionBackgroundOf({ spaceTop: 40.4 })).toMatchObject({
			type: 'NONE',
			spaceTop: 40,
			spaceBottom: null,
		});
	});

	it('gives a chosen background its usual measures', () => {
		expect(sectionBackgroundOf({ type: 'COLOR', color: '#112233' })).toEqual({
			type: 'COLOR',
			color: '#112233',
			color2: null,
			angle: 135,
			isAnimated: false,
			imageUrl: null,
			opacity: 100,
			fade: 0,
			blur: 0,
			spaceTop: null,
			spaceBottom: null,
			isWide: true,
		});
	});

	it('keeps numbers within their ranges and drops what is not a colour', () => {
		expect(
			sectionBackgroundOf({
				type: 'GRADIENT',
				color: 'red; background: url(evil)',
				color2: '#ABCDEF',
				angle: 900,
				opacity: -5,
				fade: 250,
				blur: 999,
				spaceTop: 9999,
				spaceBottom: 0,
				isWide: false,
				isAnimated: true,
			}),
		).toEqual({
			type: 'GRADIENT',
			color: null,
			color2: '#ABCDEF',
			angle: 360,
			isAnimated: true,
			imageUrl: null,
			opacity: 0,
			fade: 100,
			blur: 40,
			spaceTop: 400,
			spaceBottom: null,
			isWide: false,
		});
	});
});
