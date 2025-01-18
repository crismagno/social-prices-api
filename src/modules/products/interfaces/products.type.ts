import { TTableStateSortOrder } from '../../../shared/utils/table/table-state.interface';

export interface IProductFileUploadTemplateRow {
	rowNumber: number;
	image?: string;
	name: string;
	barcode?: string;
	description?: string;
	price?: string | number;
	quantity?: string | number;
	stores?: string;
	categories?: string;
	tags?: string;
	isActive?: string;
	details?: string;
}

export interface IFiltersDownloadProducts {
	search: string;
	tagsIds: string[];
	categoriesIds: string[];
	storeIds: string[];
	isActive: boolean | null;
	sortField: string;
	sortOrder: TTableStateSortOrder;
}
