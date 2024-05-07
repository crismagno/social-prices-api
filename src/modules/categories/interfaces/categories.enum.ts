namespace CategoriesEnum {
	export enum Type {
		PRODUCT = 'PRODUCT',
		STORE = 'STORE',
	}

	export const TypeLabels = {
		[Type.PRODUCT]: 'Product',
		[Type.STORE]: 'Store',
	};
}

export default CategoriesEnum;
