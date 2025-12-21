import { filter, find, sortBy } from 'lodash';
import * as moment from 'moment-timezone';

import { ISale } from '../../../modules/sales/interfaces/sale.interface';
import DatesEnum from '../dates/dates.enum';
import ChartsEnum from './charts-enum';
import {
	IChartDataPeriodTypeItem,
	IChartDateTotalItem,
	IChartTotalAndQuantity,
} from './charts-types';

export const parseToChartDataPeriodTypeItemByHour = (
	items: IChartDateTotalItem[],
	sales: ISale[] = [],
): IChartDataPeriodTypeItem[] => {
	const result: IChartDataPeriodTypeItem[] = [];

	for (let hour = 0; hour < 24; hour += 1) {
		const totalAndQuantity: IChartTotalAndQuantity = items.reduce(
			(acc: IChartTotalAndQuantity, item: IChartDateTotalItem) => {
				if (
					moment
						.utc(item.date)
						.tz(DatesEnum.Timezones.America_Sao_Paulo)
						.hour() === hour
				) {
					acc.total += item.total;
					acc.quantity += item.quantity;
				}

				return acc;
			},
			{
				total: 0,
				quantity: 0,
			},
		);

		const data: IChartDataPeriodTypeItem = {
			name: hour,
			...totalAndQuantity,
			salesQuantity: filter(sales, (sale: ISale) => {
				return (
					moment
						.utc(sale.createdAt)
						.tz(DatesEnum.Timezones.America_Sao_Paulo)
						.hour() === hour
				);
			}).length,
		};

		result.push(data);
	}

	return sortBy(result, 'name');
};

export const parseToChartDataPeriodTypeItemByDay = (
	items: IChartDateTotalItem[],
	sales: ISale[] = [],
): IChartDataPeriodTypeItem[] => {
	const result: IChartDataPeriodTypeItem[] = [];

	for (let day = 1; day < 32; day += 1) {
		const totalAndQuantity: IChartTotalAndQuantity = items.reduce(
			(acc: IChartTotalAndQuantity, item: IChartDateTotalItem) => {
				if (
					moment
						.utc(item.date)
						.tz(DatesEnum.Timezones.America_Sao_Paulo)
						.date() === day
				) {
					acc.total += item.total;
					acc.quantity += item.quantity;
				}

				return acc;
			},
			{
				total: 0,
				quantity: 0,
			},
		);

		const data: IChartDataPeriodTypeItem = {
			name: day,
			...totalAndQuantity,
			salesQuantity: filter(sales, (sale: ISale) => {
				return (
					moment
						.utc(sale.createdAt)
						.tz(DatesEnum.Timezones.America_Sao_Paulo)
						.date() === day
				);
			}).length,
		};

		result.push(data);
	}

	return sortBy(result, 'name');
};

export const parseToChartDataPeriodTypeItemByMonth = (
	items: IChartDateTotalItem[],
	sales: ISale[] = [],
): IChartDataPeriodTypeItem[] => {
	const result: IChartDataPeriodTypeItem[] = [];

	for (let month = 0; month < 12; month += 1) {
		const totalAndQuantity: IChartTotalAndQuantity = items.reduce(
			(acc: IChartTotalAndQuantity, item: IChartDateTotalItem) => {
				if (
					moment
						.utc(item.date)
						.tz(DatesEnum.Timezones.America_Sao_Paulo)
						.month() === month
				) {
					acc.total += item.total;
					acc.quantity += item.quantity;
				}

				return acc;
			},
			{
				total: 0,
				quantity: 0,
			},
		);

		const data: IChartDataPeriodTypeItem = {
			name: month + 1,
			...totalAndQuantity,
			salesQuantity: filter(sales, (sale: ISale) => {
				return (
					moment
						.utc(sale.createdAt)
						.tz(DatesEnum.Timezones.America_Sao_Paulo)
						.month() === month
				);
			}).length,
		};

		result.push(data);
	}

	return sortBy(result, 'name');
};

export const parseToChartDataPeriodTypeItemByYear = (
	items: IChartDateTotalItem[],
	sales: ISale[] = [],
): IChartDataPeriodTypeItem[] => {
	const result: IChartDataPeriodTypeItem[] = items.reduce(
		(acc: IChartDataPeriodTypeItem[], item: IChartDateTotalItem) => {
			const itemYear: number = moment
				.utc(item.date)
				.tz(DatesEnum.Timezones.America_Sao_Paulo)
				.year();

			const findByItemYear: IChartDataPeriodTypeItem = find(acc, {
				name: itemYear,
			});

			if (findByItemYear) {
				findByItemYear.total += item.total;
				findByItemYear.quantity += item.quantity;
				// findByItemYear.salesQuantity += filter(sales, (sale: ISale) => {
				// 	return (
				// 		moment
				// 			.utc(sale.createdAt)
				// 			.tz(DatesEnum.Timezones.America_Sao_Paulo)
				// 			.year() === itemYear
				// 	);
				// }).length;
			} else {
				acc.push({
					name: itemYear,
					total: item.total,
					quantity: item.quantity,
					salesQuantity: filter(sales, (sale: ISale) => {
						return (
							moment
								.utc(sale.createdAt)
								.tz(DatesEnum.Timezones.America_Sao_Paulo)
								.year() === itemYear
						);
					}).length,
				});
			}

			return acc;
		},
		[],
	);

	return sortBy(result, 'name');
};

export const parseToChartDataPeriodTypeItem = (
	items: IChartDateTotalItem[],
	periodType: ChartsEnum.PeriodType,
	sales: ISale[] = [],
): IChartDataPeriodTypeItem[] => {
	switch (periodType) {
		case ChartsEnum.PeriodType.HOUR:
			return parseToChartDataPeriodTypeItemByHour(items, sales);
		case ChartsEnum.PeriodType.DAY:
			return parseToChartDataPeriodTypeItemByDay(items, sales);
		case ChartsEnum.PeriodType.MONTH:
			return parseToChartDataPeriodTypeItemByMonth(items, sales);
		case ChartsEnum.PeriodType.YEAR:
			return parseToChartDataPeriodTypeItemByYear(items, sales);
		default:
			return [];
	}
};
