import { find, sortBy } from 'lodash';
import * as moment from 'moment-timezone';

import DatesEnum from '../dates/dates.enum';
import ChartsEnum from './charts-enum';
import {
	IChartDataPeriodTypeItem,
	IChartDateTotalItem,
	IChartTotalAndQuantity,
} from './charts-types';

export const parseToChartDataPeriodTypeItemByHour = (
	items: IChartDateTotalItem[],
): IChartDataPeriodTypeItem[] => {
	const result: IChartDataPeriodTypeItem[] = [];

	for (let hour = 1; hour < 25; hour += 1) {
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
		};

		result.push(data);
	}

	return sortBy(result, 'name');
};

export const parseToChartDataPeriodTypeItemByDay = (
	items: IChartDateTotalItem[],
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
		};

		result.push(data);
	}

	return sortBy(result, 'name');
};

export const parseToChartDataPeriodTypeItemByMonth = (
	items: IChartDateTotalItem[],
): IChartDataPeriodTypeItem[] => {
	const result: IChartDataPeriodTypeItem[] = [];

	for (let month = 1; month < 13; month += 1) {
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
		};

		result.push(data);
	}

	return sortBy(result, 'name');
};

export const parseToChartDataPeriodTypeItemByYear = (
	items: IChartDateTotalItem[],
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
			} else {
				acc.push({
					name: itemYear,
					total: item.total,
					quantity: item.quantity,
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
): IChartDataPeriodTypeItem[] => {
	switch (periodType) {
		case ChartsEnum.PeriodType.HOUR:
			return parseToChartDataPeriodTypeItemByHour(items);
		case ChartsEnum.PeriodType.DAY:
			return parseToChartDataPeriodTypeItemByDay(items);
		case ChartsEnum.PeriodType.MONTH:
			return parseToChartDataPeriodTypeItemByMonth(items);
		case ChartsEnum.PeriodType.YEAR:
			return parseToChartDataPeriodTypeItemByYear(items);
		default:
			return [];
	}
};
