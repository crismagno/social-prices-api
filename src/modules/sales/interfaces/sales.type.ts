import ChartsEnum from '../../../shared/charts/charts-enum';
import {
	IChartDataPeriodTypeItem,
	IChartDataProductItem,
} from '../../../shared/charts/charts-types';
import { IRangeDate } from '../../../shared/interfaces/global';
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
	chartDataProducts: IChartDataProductItem[];
}

export interface ISaleStoreProductString {
	productId: string;
	price: number;
	quantity: number;
	barCode: string;
	note: string | null;
}
