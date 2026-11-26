import { siteCatalogOf } from './store-site-catalog';

describe('siteCatalogOf', () => {
	it('shows name, price and search, and no description, for a site saved before it existed', () => {
		expect(siteCatalogOf(undefined)).toEqual({
			isNameShown: true,
			isPriceShown: true,
			isDescriptionShown: false,
			isSearchShown: true,
			isAddButtonShown: true,
			isDetailsOpened: true,
			isTitleShown: true,
			title: null,
			addLabel: null,
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
			isAddButtonShown: true,
			isDetailsOpened: true,
			isTitleShown: true,
			title: null,
			addLabel: null,
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
			isAddButtonShown: true,
			isDetailsOpened: true,
			isTitleShown: true,
			title: null,
			addLabel: null,
		});
	});

	it('drops anything else that was sent with it', () => {
		expect(siteCatalogOf({ isPriceShown: false, other: 1 })).toEqual({
			isNameShown: true,
			isPriceShown: false,
			isDescriptionShown: false,
			isSearchShown: true,
			isAddButtonShown: true,
			isDetailsOpened: true,
			isTitleShown: true,
			title: null,
			addLabel: null,
		});
	});

	it('treats what is not an object as nothing', () => {
		expect(siteCatalogOf('hidden').isPriceShown).toBe(true);
	});

	it('lets products be only shown: no add button, no details, own texts', () => {
		expect(
			siteCatalogOf({
				isAddButtonShown: false,
				isDetailsOpened: false,
				isTitleShown: false,
				title: '  Nossos trabalhos ',
				addLabel: ' Quero este ',
			}),
		).toMatchObject({
			isAddButtonShown: false,
			isDetailsOpened: false,
			isTitleShown: false,
			title: 'Nossos trabalhos',
			addLabel: 'Quero este',
		});
	});

	it('cuts texts too long and drops empty ones', () => {
		const catalog = siteCatalogOf({ title: 'x'.repeat(200), addLabel: '   ' });

		expect(catalog.title).toHaveLength(60);
		expect(catalog.addLabel).toBeNull();
	});
});
