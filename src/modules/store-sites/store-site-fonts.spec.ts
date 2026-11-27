import StoreSitesEnum from './interfaces/store-sites.enum';
import { siteFontsOf } from './store-site-fonts';

const F = StoreSitesEnum.Font;

describe('siteFontsOf', () => {
	it('leaves the typefaces to the template for a site saved before the option', () => {
		expect(siteFontsOf(undefined)).toEqual({ heading: null, body: null });
		expect(siteFontsOf(null)).toEqual({ heading: null, body: null });
		expect(siteFontsOf({})).toEqual({ heading: null, body: null });
	});

	it('keeps what the owner chose', () => {
		expect(siteFontsOf({ heading: F.PLAYFAIR_DISPLAY, body: F.INTER })).toEqual(
			{ heading: F.PLAYFAIR_DISPLAY, body: F.INTER },
		);
	});

	it('keeps one chosen and the other as the template has it', () => {
		expect(siteFontsOf({ heading: F.OSWALD })).toEqual({
			heading: F.OSWALD,
			body: null,
		});
	});

	it('drops a typeface that is not on offer, and whatever else was sent', () => {
		expect(
			siteFontsOf({
				heading: 'Comic Sans; } body { display: none',
				body: 42,
				extra: 'x',
			}),
		).toEqual({ heading: null, body: null });
	});

	it('takes anything that is not an object as nothing chosen', () => {
		expect(siteFontsOf('INTER')).toEqual({ heading: null, body: null });
		expect(siteFontsOf([F.INTER])).toEqual({ heading: null, body: null });
	});
});
