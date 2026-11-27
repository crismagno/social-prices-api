import StoreSitesEnum from './interfaces/store-sites.enum';
import { pageBackdropOf, siteBackdropOf } from './store-site-backdrop';

const S = StoreSitesEnum;

const untouched = {
	type: S.BackdropType.COLOR,
	imageUrls: [],
	slideSeconds: S.DEFAULT_SLIDE_SECONDS,
	videoUrl: null,
	posterUrl: null,
	veil: S.DEFAULT_BACKDROP_VEIL,
	blur: S.BackdropBlur.NONE,
	isAnimated: true,
};

describe('siteBackdropOf', () => {
	it('keeps the colour behind a site saved before the option', () => {
		expect(siteBackdropOf(undefined)).toEqual(untouched);
		expect(siteBackdropOf(null)).toEqual(untouched);
		expect(siteBackdropOf('IMAGES')).toEqual(untouched);
		expect(siteBackdropOf([])).toEqual(untouched);
	});

	it('keeps the images and choices of the owner', () => {
		const chosen = {
			type: S.BackdropType.IMAGES,
			imageUrls: ['a.jpg', 'b.jpg'],
			slideSeconds: 8,
			videoUrl: null,
			posterUrl: null,
			veil: 40,
			blur: S.BackdropBlur.SOFT,
			isAnimated: false,
		};

		expect(siteBackdropOf(chosen)).toEqual(chosen);
	});

	it('keeps a video with the image that stands for it', () => {
		expect(
			siteBackdropOf({
				type: S.BackdropType.VIDEO,
				videoUrl: ' loja.mp4 ',
				posterUrl: 'capa.jpg',
			}),
		).toMatchObject({
			type: S.BackdropType.VIDEO,
			videoUrl: 'loja.mp4',
			posterUrl: 'capa.jpg',
		});
	});

	it('keeps each image once, in order, without blanks, up to six', () => {
		const { imageUrls } = siteBackdropOf({
			imageUrls: ['a', ' a ', '', 7, 'b', 'c', 'd', 'e', 'f', 'g'],
		});

		expect(imageUrls).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
	});

	it('keeps the veil, the seconds and the choices within what is on offer', () => {
		expect(siteBackdropOf({ veil: -10 }).veil).toBe(0);
		expect(siteBackdropOf({ veil: 400 }).veil).toBe(95);
		expect(siteBackdropOf({ veil: '50' }).veil).toBe(S.DEFAULT_BACKDROP_VEIL);
		expect(siteBackdropOf({ slideSeconds: 0 }).slideSeconds).toBe(
			S.MIN_SLIDE_SECONDS,
		);
		expect(siteBackdropOf({ slideSeconds: 999 }).slideSeconds).toBe(
			S.MAX_SLIDE_SECONDS,
		);
		expect(siteBackdropOf({ type: 'GRADIENT', blur: 'HUGE' })).toMatchObject({
			type: S.BackdropType.COLOR,
			blur: S.BackdropBlur.NONE,
		});
	});

	it('drops a file key that is not text or is too long', () => {
		expect(
			siteBackdropOf({ videoUrl: 'x'.repeat(601), posterUrl: {} }),
		).toMatchObject({ videoUrl: null, posterUrl: null });
	});
});

describe('pageBackdropOf', () => {
	it('gives a page none of its own unless one was set', () => {
		expect(pageBackdropOf(undefined)).toBeNull();
		expect(pageBackdropOf(null)).toBeNull();
		expect(pageBackdropOf('VIDEO')).toBeNull();
		expect(pageBackdropOf([])).toBeNull();
	});

	it('checks the one of a page as the one of the site', () => {
		expect(pageBackdropOf({})).toEqual(untouched);
		expect(
			pageBackdropOf({ type: S.BackdropType.IMAGES, imageUrls: ['p.jpg'] }),
		).toMatchObject({ type: S.BackdropType.IMAGES, imageUrls: ['p.jpg'] });
	});
});
