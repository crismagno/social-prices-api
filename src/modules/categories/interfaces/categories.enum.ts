namespace CategoriesEnum {
	export enum Type {
		PRODUCT = 'PRODUCT',
		STORE = 'STORE',
		SALE = 'SALE',
	}

	export const TypeLabels = {
		[Type.PRODUCT]: 'Product',
		[Type.STORE]: 'Store',
		[Type.SALE]: 'Sale',
	};
}

export default CategoriesEnum;
