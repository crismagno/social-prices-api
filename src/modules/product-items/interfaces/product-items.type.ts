import {
	TTableStateSortOrder,
} from '../../../shared/utils/table/table-state.interface';

export interface IProductItemFileUploadTemplateRow {
	rowNumber: number;
	image?: string;
	name: string;
	barcode?: string;
	sku?: string;
	description?: string;
	price?: string | number;
	quantity?: string | number;
	stores?: string;
	categories?: string;
	tags?: string;
	isActive?: string;
	details?: string;
	brand?: string;
	releaseDate?: string;
	expirationDate?: string;
	colors?: string;
	dimensionSize?: string;
	dimensionHeight?: string;
	dimensionWidth?: string;
	dimensionLength?: string;
	dimensionDepth?: string;
	dimensionDiameter?: string;
	dimensionThickness?: string;
	dimensionVolume?: string;
	dimensionWeight?: string;
	productBarcode?: string;
}

export interface IFiltersDownloadProductItems {
	search: string;
	tagsIds: string[];
	categoriesIds: string[];
	storeIds: string[];
	isActive: boolean | null;
	sortField: string;
	sortOrder: TTableStateSortOrder;
}
