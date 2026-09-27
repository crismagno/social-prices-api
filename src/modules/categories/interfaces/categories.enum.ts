namespace CategoriesEnum {
	export enum Type {
		PRODUCT = 'PRODUCT',
		STORE = 'STORE',
		SALE = 'SALE',
		TRANSACTION = 'TRANSACTION',
		NOTE = 'NOTE',
	}

	export const TypeLabels = {
		[Type.PRODUCT]: 'Product',
		[Type.STORE]: 'Store',
		[Type.SALE]: 'Sale',
		[Type.TRANSACTION]: 'Transaction',
		[Type.NOTE]: 'Note',
	};
}

export default CategoriesEnum;
