namespace PersonEnum {
	export enum Gender {
		FEMALE = 'FEMALE',
		MALE = 'MALE',
		OTHER = 'OTHER',
	}

	export const GenderLabels = {
		[Gender.OTHER]: 'Other',
		[Gender.FEMALE]: 'Female',
		[Gender.MALE]: 'Male',
	};
}

export default PersonEnum;
