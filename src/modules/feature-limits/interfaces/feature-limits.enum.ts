namespace FeatureLimitsEnum {
	export enum Feature {
		PRODUCTS = 'products',
		PRODUCT_ITEMS = 'product-items',
		CUSTOMERS = 'customers',
		EMPLOYEES = 'employees',
		STORES = 'stores',
		CATEGORIES = 'categories',
		TAGS = 'tags',
	}

	export const DefaultLimits: Record<Feature, number> = {
		[Feature.PRODUCTS]: 500,
		[Feature.PRODUCT_ITEMS]: 1000,
		[Feature.CUSTOMERS]: 1000,
		[Feature.EMPLOYEES]: 3,
		[Feature.STORES]: 1,
		[Feature.CATEGORIES]: 100,
		[Feature.TAGS]: 100,
	};
}

export default FeatureLimitsEnum;
