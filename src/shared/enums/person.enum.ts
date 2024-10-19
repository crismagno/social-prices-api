namespace PersonEnum {
	export enum Gender {
		FEMALE = 'FEMALE',
		MALE = 'MALE',
		OTHER = 'OTHER',
	}

	export enum GenderPascal {
		Female = 'Female',
		Male = 'Male',
		Other = 'Other',
	}

	export const genderPascalList = Object.keys(GenderPascal);
}

export default PersonEnum;
