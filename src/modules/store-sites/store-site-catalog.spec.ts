import { siteCatalogOf } from './store-site-catalog';

describe('siteCatalogOf', () => {
	it('shows name, price and search, and no description, for a site saved before it existed', () => {
		expect(siteCatalogOf(undefined)).toEqual({
			isNameShown: true,
			isPriceShown: true,
			isDescriptionShown: false,
			isSearchShown: true,
		});
	});

	it('keeps what the owner chose', () => {
		expect(
			siteCatalogOf({
				isNameShown: false,
				isPriceShown: false,
				isDescriptionShown: true,
				isSearchShown: false,
			}),
		).toEqual({
			isNameShown: false,
			isPriceShown: false,
			isDescriptionShown: true,
			isSearchShown: false,
		});
	});

	it('falls back to the default of each choice that is not a boolean', () => {
		expect(
			siteCatalogOf({
				isNameShown: 'no',
				isPriceShown: 0,
				isDescriptionShown: 'yes',
				isSearchShown: null,
			}),
		).toEqual({
			isNameShown: true,
			isPriceShown: true,
			isDescriptionShown: false,
			isSearchShown: true,
		});
	});

	it('drops anything else that was sent with it', () => {
		expect(siteCatalogOf({ isPriceShown: false, other: 1 })).toEqual({
			isNameShown: true,
			isPriceShown: false,
			isDescriptionShown: false,
			isSearchShown: true,
		});
	});

	it('treats what is not an object as nothing', () => {
		expect(siteCatalogOf('hidden').isPriceShown).toBe(true);
	});
});
