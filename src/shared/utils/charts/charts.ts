import { find, sortBy } from 'lodash';
import * as moment from 'moment';

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

	for (let hour = 0; hour < 24; hour += 1) {
		const totalAndQuantity: IChartTotalAndQuantity = items.reduce(
			(acc: IChartTotalAndQuantity, item: IChartDateTotalItem) => {
				if (moment.utc(item.date).hour() === hour) {
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
			name: hour + 1,
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

	for (let day = 0; day < 31; day += 1) {
		const totalAndQuantity: IChartTotalAndQuantity = items.reduce(
			(acc: IChartTotalAndQuantity, item: IChartDateTotalItem) => {
				if (moment.utc(item.date).day() === day) {
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
			name: day + 1,
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

	for (let month = 0; month < 12; month += 1) {
		const totalAndQuantity: IChartTotalAndQuantity = items.reduce(
			(acc: IChartTotalAndQuantity, item: IChartDateTotalItem) => {
				if (moment.utc(item.date).month() === month) {
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
			const itemYear: number = moment.utc(item.date).year();

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
