import StoreSitesEnum from './interfaces/store-sites.enum';
import { siteImageStyleOf } from './store-site-image-style';

const Shape = StoreSitesEnum.ImageShape;
const Ratio = StoreSitesEnum.ImageRatio;

describe('siteImageStyleOf', () => {
	it("keeps each template's own images for a site saved before it existed", () => {
		const own = { shape: Shape.TEMPLATE, ratio: Ratio.TEMPLATE };

		expect(siteImageStyleOf(undefined)).toEqual({
			product: own,
			section: own,
			block: own,
		});
	});

	it('keeps what the owner chose for each place', () => {
		expect(
			siteImageStyleOf({
				product: { shape: Shape.ARCH, ratio: Ratio.PORTRAIT },
				section: { shape: Shape.SQUARE },
				block: { shape: Shape.CIRCLE, ratio: Ratio.WIDE },
			}),
		).toEqual({
			product: { shape: Shape.ARCH, ratio: Ratio.PORTRAIT },
			section: { shape: Shape.SQUARE, ratio: Ratio.TEMPLATE },
			// A circle is always as tall as it is wide.
			block: { shape: Shape.CIRCLE, ratio: Ratio.SQUARE },
		});
	});

	it('falls back for unknown choices and survives garbage', () => {
		expect(
			siteImageStyleOf({ product: { shape: 'STAR', ratio: 7 }, block: 'x' })
				.product,
		).toEqual({ shape: Shape.TEMPLATE, ratio: Ratio.TEMPLATE });
		expect(siteImageStyleOf([1, 2]).block).toEqual({
			shape: Shape.TEMPLATE,
			ratio: Ratio.TEMPLATE,
		});
	});
});
