export interface IChartDateTotalItem {
	total: number;
	date: Date;
	quantity: number;
}

export interface IChartDataPeriodTypeItem {
	total: number;
	name: any;
	quantity: number;
}

export interface IChartDataProductItem {
	total: number;
	quantity: number;
	name: any;
	productId: string;
	mainUrl?: string;
}
