import StoreSitesEnum from './interfaces/store-sites.enum';
import { cartLookOf, siteCheckoutOf } from './store-site-checkout';

const Field = StoreSitesEnum.CheckoutField;
const Mode = StoreSitesEnum.ChatFieldMode;

describe('siteCheckoutOf', () => {
	it('asks what every site asked, for a site saved before the option', () => {
		expect(siteCheckoutOf(undefined).fields).toEqual({
			[Field.EMAIL]: Mode.REQUIRED,
			[Field.PHONE]: Mode.REQUIRED,
			[Field.ADDRESS]: Mode.REQUIRED,
			[Field.NOTE]: Mode.OPTIONAL,
		});
	});

	it('keeps what the owner chose for each field', () => {
		expect(
			siteCheckoutOf({
				fields: {
					[Field.EMAIL]: Mode.OPTIONAL,
					[Field.PHONE]: Mode.REQUIRED,
					[Field.ADDRESS]: Mode.HIDDEN,
					[Field.NOTE]: Mode.REQUIRED,
				},
			}).fields,
		).toEqual({
			[Field.EMAIL]: Mode.OPTIONAL,
			[Field.PHONE]: Mode.REQUIRED,
			[Field.ADDRESS]: Mode.HIDDEN,
			[Field.NOTE]: Mode.REQUIRED,
		});
	});

	it('falls back field by field on what it does not know', () => {
		const { fields } = siteCheckoutOf({
			fields: { [Field.EMAIL]: 'MAYBE', [Field.NOTE]: Mode.HIDDEN, cpf: 1 },
		});

		expect(fields[Field.EMAIL]).toBe(Mode.REQUIRED);
		expect(fields[Field.NOTE]).toBe(Mode.HIDDEN);
		expect(Object.keys(fields)).toHaveLength(4);
	});

	it('survives garbage', () => {
		expect(siteCheckoutOf('x').fields[Field.ADDRESS]).toBe(Mode.REQUIRED);
		expect(siteCheckoutOf({ fields: [] }).fields[Field.PHONE]).toBe(
			Mode.REQUIRED,
		);
	});
});

describe('cartLookOf', () => {
	it('shows everything as before, for a site saved before the option', () => {
		expect(cartLookOf(undefined)).toEqual({
			title: null,
			width: StoreSitesEnum.CartWidth.NORMAL,
			side: StoreSitesEnum.CartSide.RIGHT,
			isPhotoShown: true,
			isBrandShown: true,
			isDescriptionShown: true,
			isTagsShown: true,
			isProductOpened: true,
			isShippingNoteShown: true,
			shippingNote: null,
			buttonLabel: null,
		});
	});

	it('keeps what the owner chose and trims the texts', () => {
		const look = cartLookOf({
			title: '  Minha sacola ',
			width: StoreSitesEnum.CartWidth.WIDE,
			side: StoreSitesEnum.CartSide.LEFT,
			isPhotoShown: false,
			isProductOpened: false,
			shippingNote: 'Frete grátis',
			buttonLabel: 'Fechar pedido',
		});

		expect(look).toMatchObject({
			title: 'Minha sacola',
			width: StoreSitesEnum.CartWidth.WIDE,
			side: StoreSitesEnum.CartSide.LEFT,
			isPhotoShown: false,
			isBrandShown: true,
			isProductOpened: false,
			shippingNote: 'Frete grátis',
			buttonLabel: 'Fechar pedido',
		});
	});

	it('drops unknown choices, blank and overlong texts', () => {
		const look = cartLookOf({
			title: '   ',
			width: 'HUGE',
			side: 1,
			buttonLabel: 'x'.repeat(80),
			isTagsShown: 'no',
		});

		expect(look.title).toBeNull();
		expect(look.width).toBe(StoreSitesEnum.CartWidth.NORMAL);
		expect(look.side).toBe(StoreSitesEnum.CartSide.RIGHT);
		expect(look.buttonLabel).toHaveLength(30);
		expect(look.isTagsShown).toBe(true);
	});

	it('is part of the checkout', () => {
		expect(
			siteCheckoutOf({ look: { isBrandShown: false } }).look.isBrandShown,
		).toBe(false);
	});
});
