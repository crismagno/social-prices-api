export interface IChartDateTotalItem {
	total: number;
	date: Date;
	quantity: number;
}

export interface IChartDataPeriodTypeItem {
	total: number;
	name: any;
	quantity: number;
	salesQuantity: number;
}

export interface IChartDataProductItem {
	total: number;
	quantity: number;
	name: any;
	productId: string;
	mainUrl?: string;
}

export interface IChartTotalAndQuantity {
	total: number;
	quantity: number;
}
