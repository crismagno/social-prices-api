import { IRangeDate } from '../../../shared/interfaces/global.interface';
import ChartsEnum from '../../../shared/utils/charts/charts-enum';
import {
	IChartDataPeriodTypeItem,
	IChartDataProductItem,
} from '../../../shared/utils/charts/charts-types';
import { TTableStateSortOrder } from '../../../shared/utils/table/table-state.interface';
import { IProduct } from '../../products/interfaces/product.interface';
import SalesEnum from './sales.enum';

export interface IProductToSubtract {
	productId: string;
	quantity: number;
}

export interface IProductQuantity {
	productId: string;
	quantity: number;
}

export interface IGetSalesAnalyticsParams {
	storesIds?: string[];
	status?: SalesEnum.Status[];
	types?: SalesEnum.Type[];
	tagsIds?: string[];
	productIds?: string[];
	rangeDate?: IRangeDate;
	periodType?: ChartsEnum.PeriodType;
}

export interface IGetSalesAnalyticsResponse {
	chartDataPeriodType: IChartDataPeriodTypeItem[];
	chartDataProductsByTotal: IChartDataProductItem[];
	chartDataProductsByQuantity: IChartDataProductItem[];
}

export interface ISaleStoreProductString {
	productId: string;
	price: number;
	quantity: number;
	barcode: string;
	note: string | null;
}

export interface IGetSalesBalanceParams {
	rangeDate?: IRangeDate;
}

export interface IGetSalesBalanceResponse {
	hour: IGetSalesBalanceTotalsResponse;
	day: IGetSalesBalanceTotalsResponse;
	month: IGetSalesBalanceTotalsResponse;
	annual: IGetSalesBalanceTotalsResponse;
}

export interface IGetSalesBalanceTotalsResponse {
	total: number;
	quantity: number;
	productsBalance: IGetSalesProductBalanceResponse[];
}

export interface IGetSalesProductBalanceResponse {
	product?: IProduct;
	productId: string;
	total: number;
	quantity: number;
}

// #region Upload

export interface ISaleFileUploadTemplateRow {
	rowNumber: number;
	uniqName?: string;
	name?: string;
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
	selectedProducts?: string;
	discount?: string | number;
	shipping?: string | number;
	tax?: string | number;
	payments?: string;
	note?: string;
	saleStatus?: string;
	paymentStatus?: string;
	deliveryDate?: string;
}

export interface IFiltersDownloadSales {
	search: string;
	type: SalesEnum.Type;
	tagsIds: string[];
	sortField: string;
	sortOrder: TTableStateSortOrder;
}

// #endregion
