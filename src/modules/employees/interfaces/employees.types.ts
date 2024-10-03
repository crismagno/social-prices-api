import EmployeesEnum from './employees.enum';

export interface ISearchEmployee {
	employeeName: string;
	employeeUsername: string;
	employeeAvatar?: string;
	employeeEmail: string;
	employeeLevel: EmployeesEnum.Level;
	employeeStatus: EmployeesEnum.Status;
	userName: string;
	userUsername: string;
	userAvatar?: string;
}
