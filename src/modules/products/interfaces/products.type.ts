import {
	TTableStateSortOrder,
} from '../../../shared/utils/table/table-state.interface';

export interface IProductFileUploadTemplateRow {
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
	// Dimensions
	dimensionSize?: string;
	dimensionHeight?: string | number;
	dimensionWidth?: string | number;
	dimensionLength?: string | number;
	dimensionDepth?: string | number;
	dimensionDiameter?: string | number;
	dimensionThickness?: string | number;
	dimensionVolume?: string | number;
	dimensionWeight?: string | number;
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
