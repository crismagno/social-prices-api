namespace FeatureLimitsEnum {
	export enum Feature {
		PRODUCTS = 'products',
		PRODUCT_ITEMS = 'product-items',
		CUSTOMERS = 'customers',
		EMPLOYEES = 'employees',
		STORES = 'stores',
		CATEGORIES = 'categories',
		TAGS = 'tags',
		QUICK_MESSAGES = 'quick-messages',
		SITE_MOCKS = 'site-mocks',
	}

	export const DefaultLimits: Record<Feature, number> = {
		[Feature.PRODUCTS]: 500,
		[Feature.PRODUCT_ITEMS]: 1000,
		[Feature.CUSTOMERS]: 1000,
		[Feature.EMPLOYEES]: 3,
		[Feature.STORES]: 1,
		[Feature.CATEGORIES]: 100,
		[Feature.TAGS]: 100,
		[Feature.QUICK_MESSAGES]: 50,
		[Feature.SITE_MOCKS]: 2,
	};

	// Features that came after the limits: an account where a manager never set
	// one gets the default, not "unlimited". A manager raises it per account.
	export const LimitedWhenUnset: Feature[] = [Feature.SITE_MOCKS];

	// The features a manager can switch off for an account. One that was never
	// set is active.
	export const ToggleableFeatures: Feature[] = [Feature.QUICK_MESSAGES];
}

export default FeatureLimitsEnum;
