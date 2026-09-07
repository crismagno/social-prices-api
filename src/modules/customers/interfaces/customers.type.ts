import PersonEnum from '../../../shared/common/person/person.enum';
import { TTableStateSortOrder } from '../../../shared/utils/table/table-state.interface';

export interface IFindByOwnerUserIdAndPropertiesParams {
	ownerUserId: string;
	email: string;
	name: string;
	birthDate: Date | null;
}

export interface ICustomerFileUploadTemplateRow {
	rowNumber: number;
	name: string;
	email?: string;
	birthDate?: string;
	gender?: string;
	tags?: string;
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

export interface IFiltersDownloadCustomers {
	search: string;
	gender: PersonEnum.Gender;
	tagsIds: string[];
	sortField: string;
	sortOrder: TTableStateSortOrder;
}
