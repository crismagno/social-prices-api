namespace TagsEnum {
	export enum Type {
		STORE = 'STORE',
		SALE = 'SALE',
		ANY = 'ANY',
		PRODUCT = 'PRODUCT',
		CUSTOMER = 'CUSTOMER',
		EMPLOYEE = 'EMPLOYEE',
	}

	export const TypeLabels = {
		[Type.STORE]: 'Store',
		[Type.SALE]: 'Sale',
		[Type.ANY]: 'Any',
		[Type.PRODUCT]: 'Product',
		[Type.EMPLOYEE]: 'Employee',
		[Type.CUSTOMER]: 'Customer',
	};

	export const tagDefaultColor: string = '#cccccc';
}

export default TagsEnum;
