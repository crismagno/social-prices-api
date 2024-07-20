namespace TagsEnum {
	export enum Type {
		STORE = 'STORE',
		SALE = 'SALE',
		ANY = 'ANY',
		PRODUCT = 'PRODUCT',
		CUSTOMER = 'CUSTOMER',
	}

	export const TypeLabels = {
		[Type.STORE]: 'Store',
		[Type.SALE]: 'Sale',
		[Type.ANY]: 'Any',
		[Type.PRODUCT]: 'Product',
		[Type.CUSTOMER]: 'Customer',
	};
}

export default TagsEnum;
