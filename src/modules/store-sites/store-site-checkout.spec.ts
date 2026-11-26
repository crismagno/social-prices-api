import StoreSitesEnum from './interfaces/store-sites.enum';
import { siteCheckoutOf } from './store-site-checkout';

const Field = StoreSitesEnum.CheckoutField;
const Mode = StoreSitesEnum.ChatFieldMode;

describe('siteCheckoutOf', () => {
	it('asks what every site asked, for a site saved before the option', () => {
		expect(siteCheckoutOf(undefined)).toEqual({
			fields: {
				[Field.EMAIL]: Mode.REQUIRED,
				[Field.PHONE]: Mode.REQUIRED,
				[Field.ADDRESS]: Mode.REQUIRED,
				[Field.NOTE]: Mode.OPTIONAL,
			},
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
