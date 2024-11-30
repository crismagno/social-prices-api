namespace AddressEnum {
	export enum Type {
		SHIPPING = 'SHIPPING',
		HOME = 'HOME',
		NORMAL = 'NORMAL',
	}

	export const TypesLabels = {
		[Type.SHIPPING]: 'Shipping',
		[Type.HOME]: 'Home',
		[Type.NORMAL]: 'Normal',
	};
}

export default AddressEnum;
