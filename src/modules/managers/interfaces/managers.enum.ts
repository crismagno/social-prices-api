namespace ManagersEnum {
	export enum Level {
		ADMIN = 'ADMIN',
		MANAGER = 'MANAGER',
		SUB_MANAGER = 'SUB_MANAGER',
	}

	export const LevelLabels = {
		[Level.ADMIN]: 'Admin',
		[Level.MANAGER]: 'Manager',
		[Level.SUB_MANAGER]: 'Sub Manager',
	};
}

export default ManagersEnum;
