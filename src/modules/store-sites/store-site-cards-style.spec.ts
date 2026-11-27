import StoreSitesEnum from './interfaces/store-sites.enum';
import { siteCardLookOf, siteCardsStyleOf } from './store-site-cards-style';

const S = StoreSitesEnum;

describe('siteCardsStyleOf', () => {
	const untouched = {
		layout: S.CardsLayout.TEMPLATE,
		columns: 3,
		gap: S.CardsGap.MEDIUM,
	};

	it('leaves the cards to the template for a site saved before the options', () => {
		expect(siteCardsStyleOf(undefined)).toEqual(untouched);
		expect(siteCardsStyleOf(null)).toEqual(untouched);
		expect(siteCardsStyleOf('CUSTOM')).toEqual(untouched);
		expect(siteCardsStyleOf([])).toEqual(untouched);
	});

	it('keeps what the owner chose for the line', () => {
		const chosen = {
			layout: S.CardsLayout.CUSTOM,
			columns: 2,
			gap: S.CardsGap.LARGE,
		};

		expect(siteCardsStyleOf(chosen)).toEqual(chosen);
	});

	it('keeps the places of a line within one and four', () => {
		expect(siteCardsStyleOf({ columns: 0 }).columns).toBe(1);
		expect(siteCardsStyleOf({ columns: 9 }).columns).toBe(4);
		expect(siteCardsStyleOf({ columns: 2.6 }).columns).toBe(3);
		expect(siteCardsStyleOf({ columns: '2' }).columns).toBe(3);
		expect(siteCardsStyleOf({ columns: NaN }).columns).toBe(3);
	});

	it('falls back on a choice that is not one on offer and drops the rest', () => {
		expect(
			siteCardsStyleOf({ layout: 'MASONRY', gap: 'HUGE', look: 'BOXED' }),
		).toEqual(untouched);
	});
});

describe('siteCardLookOf', () => {
	const untouched = {
		imagePosition: S.CardsImagePosition.TOP,
		textAlign: S.CardsAlign.LEFT,
		look: S.CardsLook.PLAIN,
		span: 1,
	};

	it('draws a card the plain way until the owner chooses for it', () => {
		expect(siteCardLookOf(undefined)).toEqual(untouched);
		expect(siteCardLookOf(null)).toEqual(untouched);
		expect(siteCardLookOf('LEFT')).toEqual(untouched);
	});

	it('keeps what the owner chose for that card', () => {
		const chosen = {
			imagePosition: S.CardsImagePosition.RIGHT,
			textAlign: S.CardsAlign.CENTER,
			look: S.CardsLook.BOXED,
			span: 2,
		};

		expect(siteCardLookOf(chosen)).toEqual(chosen);
	});

	it('keeps the places a card takes within one and four', () => {
		expect(siteCardLookOf({ span: 0 }).span).toBe(1);
		expect(siteCardLookOf({ span: 12 }).span).toBe(4);
		expect(siteCardLookOf({ span: '3' }).span).toBe(1);
	});

	it('falls back on each choice that is not one on offer', () => {
		expect(
			siteCardLookOf({
				imagePosition: 'ALTERNATE',
				textAlign: 'JUSTIFY',
				look: 'GLASS',
				extra: true,
			}),
		).toEqual(untouched);
	});
});
