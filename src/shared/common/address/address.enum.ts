namespace AddressEnum {
	export enum Type {
		SHIPPING = 'SHIPPING',
		HOME = 'HOME',
		NORMAL = 'NORMAL',
		BUSINESS = 'BUSINESS',
	}

	export const TypesLabels = {
		[Type.SHIPPING]: 'Shipping',
		[Type.HOME]: 'Home',
		[Type.NORMAL]: 'Normal',
		[Type.BUSINESS]: 'Business',
	};
}

export default AddressEnum;
