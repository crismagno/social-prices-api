import StoreSitesEnum from './interfaces/store-sites.enum';
import { siteCartButtonOf } from './store-site-cart-button';

describe('siteCartButtonOf', () => {
	it('shows the bag as the template draws it for a site saved before the option', () => {
		expect(siteCartButtonOf(undefined)).toEqual({
			isVisible: true,
			icon: StoreSitesEnum.CartButtonIcon.NONE,
			label: null,
			isLabelVisible: true,
			size: StoreSitesEnum.CartButtonSize.MEDIUM,
		});
	});

	it('keeps what the owner chose, the words trimmed and cut', () => {
		expect(
			siteCartButtonOf({
				isVisible: false,
				icon: StoreSitesEnum.CartButtonIcon.CART,
				label: ' Meu pedido ',
				isLabelVisible: false,
				size: StoreSitesEnum.CartButtonSize.LARGE,
			}),
		).toEqual({
			isVisible: false,
			icon: StoreSitesEnum.CartButtonIcon.CART,
			label: 'Meu pedido',
			isLabelVisible: false,
			size: StoreSitesEnum.CartButtonSize.LARGE,
		});
		expect(siteCartButtonOf({ label: 'x'.repeat(50) }).label).toHaveLength(20);
	});

	it('never leaves a button with neither an icon nor words', () => {
		expect(
			siteCartButtonOf({
				icon: StoreSitesEnum.CartButtonIcon.NONE,
				isLabelVisible: false,
			}).isLabelVisible,
		).toBe(true);
	});

	it('falls back for unknown choices', () => {
		const button = siteCartButtonOf({
			icon: 'TRUCK',
			size: 'HUGE',
			isVisible: 'no',
		});

		expect(button.icon).toBe(StoreSitesEnum.CartButtonIcon.NONE);
		expect(button.size).toBe(StoreSitesEnum.CartButtonSize.MEDIUM);
		expect(button.isVisible).toBe(true);
	});
});
