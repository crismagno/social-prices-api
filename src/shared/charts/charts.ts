import { find, sortBy } from 'lodash';
import * as moment from 'moment';

import ChartsEnum from './charts-enum';
import { IChartDataPeriodTypeItem, IChartDateTotalItem } from './charts-types';

export const parseToChartDataPeriodTypeItemByHour = (
	items: IChartDateTotalItem[],
): IChartDataPeriodTypeItem[] => {
	const result: IChartDataPeriodTypeItem[] = [];

	for (let hour = 0; hour < 24; hour += 1) {
		const itemsFiltered: IChartDateTotalItem[] = items.filter(
			(item) => moment.utc(item.date).hour() === hour,
		);

		const total: number = itemsFiltered.reduce(
			(acc, item) => (acc += item.total),
			0,
		);

		const quantity: number = itemsFiltered.reduce(
			(acc, item) => (acc += item.quantity),
			0,
		);

		const data: IChartDataPeriodTypeItem = {
			total,
			name: hour + 1,
			quantity,
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
		const itemsFiltered: IChartDateTotalItem[] = items.filter(
			(item) => moment.utc(item.date).day() === day,
		);

		const total: number = itemsFiltered.reduce(
			(acc, item) => (acc += item.total),
			0,
		);

		const quantity: number = itemsFiltered.reduce(
			(acc, item) => (acc += item.quantity),
			0,
		);

		const data: IChartDataPeriodTypeItem = {
			total,
			name: day + 1,
			quantity,
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
		const itemsFiltered: IChartDateTotalItem[] = items.filter(
			(item) => moment.utc(item.date).day() === month,
		);

		const total: number = itemsFiltered.reduce(
			(acc, item) => (acc += item.total),
			0,
		);

		const quantity: number = itemsFiltered.reduce(
			(acc, item) => (acc += item.quantity),
			0,
		);

		const data: IChartDataPeriodTypeItem = {
			total,
			name: month + 1,
			quantity,
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
			const itemYear: number = moment(item.date).year();

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
