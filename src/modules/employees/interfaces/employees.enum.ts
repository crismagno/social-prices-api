namespace EmployeesEnum {
	export enum Level {
		ADMIN = 'ADMIN',
		MASTER = 'MASTER',
		EMPLOYEE = 'EMPLOYEE',
	}

	export const LevelLabels = {
		[Level.ADMIN]: 'Admin',
		[Level.MASTER]: 'Master',
		[Level.EMPLOYEE]: 'Employee',
	};

	export enum Status {
		PENDING = 'PENDING',
		ACTIVE = 'ACTIVE',
		STOPPED = 'STOPPED',
	}
}

export default EmployeesEnum;
