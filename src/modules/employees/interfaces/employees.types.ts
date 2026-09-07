import PersonEnum from '../../../shared/common/person/person.enum';
import { TTableStateSortOrder } from '../../../shared/utils/table/table-state.interface';
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

export interface IEmployeeFileUploadTemplateRow {
	rowNumber: number;
	name: string;
	email: string;
	password: string;
	birthDate?: string;
	gender?: string;
	tags?: string;
	level?: string;
	about?: string;
	country?: string;
	state?: string;
	city?: string;
	zipCode?: string | number;
	address1?: string;
	address2?: string;
	district?: string;
	addressDescription?: string;
	addressTypes?: string;
	phoneType?: string;
	phoneNumber?: string | number;
	phoneMessengers?: string;
}

export interface IFiltersDownloadEmployees {
	search: string;
	gender: PersonEnum.Gender;
	tagsIds: string[];
	sortField: string;
	level: EmployeesEnum.Level[];
	status: EmployeesEnum.Status[];
	sortOrder: TTableStateSortOrder;
}
