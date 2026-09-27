import { escapeRegExp } from 'lodash';
import { FilterQuery, Types } from 'mongoose';

import { Transaction } from './interfaces/transaction.schema';
import TransactionsEnum from './interfaces/transactions.enum';
import { ITransactionFilters } from './interfaces/transactions.types';

const toFiniteNumber = (value: unknown): number | null =>
	typeof value === 'number' && Number.isFinite(value) ? value : null;

const toValidDate = (value: unknown): Date | null => {
	if (!value) {
		return null;
	}

	const date: Date = new Date(value as string | Date);

	return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * The single place that turns a grid request into a Mongo filter. The grid
 * query and the summary aggregation both use it, so the chart can never show
 * a different set of records than the grid.
 *
 * Always scoped by the user (as an ObjectId: `aggregate` does not cast).
 */
export const buildTransactionFilter = (
	userId: string,
	request: { search?: string; filters?: ITransactionFilters },
	options: { excludeCanceledByDefault?: boolean } = {},
): FilterQuery<Transaction> => {
	const filter: FilterQuery<Transaction> = {
		userId: new Types.ObjectId(userId),
	};

	const filters: ITransactionFilters = request?.filters ?? {};

	const searchText: string | undefined = request?.search?.trim();

	if (searchText) {
		const search: RegExp = new RegExp(escapeRegExp(searchText), 'i');

		filter.$or = [{ name: search }, { note: search }];
	}

	if (filters.type?.length) {
		filter.type = { $in: filters.type };
	}

	if (filters.status?.length) {
		filter.status = { $in: filters.status };
	} else if (options.excludeCanceledByDefault) {
		filter.status = { $ne: TransactionsEnum.Status.CANCELED };
	}

	const min: number | null = toFiniteNumber(filters.value?.min);
	const max: number | null = toFiniteNumber(filters.value?.max);

	if (min !== null || max !== null) {
		filter.value = {
			...(min !== null ? { $gte: min } : {}),
			...(max !== null ? { $lte: max } : {}),
		};
	}

	const startDate: Date | null = toValidDate(filters.rangeDate?.startDate);
	const endDate: Date | null = toValidDate(filters.rangeDate?.endDate);

	if (startDate || endDate) {
		filter.createdDate = {
			...(startDate ? { $gte: startDate } : {}),
			...(endDate ? { $lte: endDate } : {}),
		};
	}

	if (filters.storeIds?.length) {
		filter.storeIds = { $in: filters.storeIds };
	}

	if (filters.tagsIds?.length) {
		filter.tagsIds = { $in: filters.tagsIds };
	}

	if (filters.categoriesIds?.length) {
		filter.categoriesIds = { $in: filters.categoriesIds };
	}

	return filter;
};
