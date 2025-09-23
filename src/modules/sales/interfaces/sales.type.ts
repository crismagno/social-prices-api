import { IRangeDate } from '../../../shared/common/global/global.interface';
import ChartsEnum from '../../../shared/utils/charts/charts-enum';
import {
	IChartDataPeriodTypeItem,
	IChartDataProductItem,
} from '../../../shared/utils/charts/charts-types';
import { TTableStateSortOrder } from '../../../shared/utils/table/table-state.interface';
import { ICustomer } from '../../customers/interfaces/customer.interface';
import { IFileUploadTemplateErrorRow } from '../../files-uploads/interfaces/files-uploads.type';
import { IProduct } from '../../products/interfaces/product.interface';
import { ITag } from '../../tags/interfaces/tags.interface';
import { ISale } from './sale.interface';
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
	customerIds?: string[];
	status?: SalesEnum.Status[];
	types?: SalesEnum.Type[];
	tagsIds?: string[];
	productIds?: string[];
	rangeDate?: IRangeDate;
	periodType?: ChartsEnum.PeriodType;
	paymentStatus?: SalesEnum.PaymentStatus[];
	deliveryTypes?: SalesEnum.DeliveryType[];
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
	storeId?: string;
	customerId?: string;
	productIds?: string[];
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
	deliveryType?: string;
	createdDate?: string;
	saleNumberManual?: string;
}

export interface IFiltersDownloadSales {
	search: string | null;
	tagsIds: string[];
	types: SalesEnum.Type[];
	rangeCreatedDate: IRangeDate | null;
	selectedProductIds: string[];
	deliveryTypes: SalesEnum.DeliveryType[];
	status: SalesEnum.Status[];
	paymentStatus: SalesEnum.PaymentStatus[];
	storeIds: string[];
	customerIds: string[];
	sortField: SalesEnum.SortField;
	sortOrder: TTableStateSortOrder;
}

export interface ISaleFileUploadTemplateSelectedProductFormat {
	store: string;
	products: ISaleFileUploadTemplateSelectedProductItemFormat[];
}

export interface ISaleFileUploadTemplateSelectedProductItemFormat {
	barcode: string;
	quantity: number;
	price: number;
}

export interface ISaleFileUploadTemplateRowPaymentFormat {
	type: SalesEnum.PaymentType;
	amount: number;
}

export interface ISaleToCreateByUpload {
	rowNumber: number;
	sale: ISale;
	customer: ICustomer;
	tags: ITag[];
}

export interface ISaleStoresProductsTotals {
	subtotal: number;
	quantity: number;
}

export interface ISubtotalAndTotalFinalAmount {
	subtotalAmount: number;
	totalFinalAmount: number;
}

export interface ITotalsProcessedFileUploadTemplateRows {
	rowsError: IFileUploadTemplateErrorRow<ISaleFileUploadTemplateRow>[];
	totalError: number;
	totalSuccess: number;
	totalProcessed: number;
}

// #endregion

export interface IGetSalesSummaryByUserTableStateResponse {
	totalFinal: number;
	discount: number;
	tax: number;
	shipping: number;
	subtotal: number;
}

export interface ISalePdf {
	sale: ISale;
	pdfBuffer: Buffer;
}
