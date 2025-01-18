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

// export interface IFiltersDownloadProduct {
// 	search: string;
// 	tagsIds: string[];
// 	categoriesIds: string[];
// 	sortField: string;
// 	sortOrder: TTableStateSortOrder;
// }
