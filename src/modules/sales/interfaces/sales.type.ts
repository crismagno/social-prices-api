import { IRangeDate } from '../../../shared/interfaces/global.interface';
import ChartsEnum from '../../../shared/utils/charts/charts-enum';
import {
	IChartDataPeriodTypeItem,
	IChartDataProductItem,
} from '../../../shared/utils/charts/charts-types';
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
