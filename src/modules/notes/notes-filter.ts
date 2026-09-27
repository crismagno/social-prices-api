import { escapeRegExp } from 'lodash';
import { FilterQuery, Types } from 'mongoose';

import { Note } from './interfaces/note.schema';
import { INoteFilters } from './interfaces/notes.types';

const toValidDate = (value: unknown): Date | null => {
	if (!value) {
		return null;
	}

	const date: Date = new Date(value as string | Date);

	return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * The single place that turns a grid/calendar request into a Mongo filter.
 * The grid query and the calendar-marker aggregation both use it, so the
 * calendar can never badge a day the grid would not show.
 *
 * Always scoped by the user (as an ObjectId: `aggregate` does not cast).
 */
export const buildNoteFilter = (
	userId: string,
	request: { search?: string; filters?: INoteFilters },
): FilterQuery<Note> => {
	const filter: FilterQuery<Note> = { userId: new Types.ObjectId(userId) };

	const filters: INoteFilters = request?.filters ?? {};

	const searchText: string | undefined = request?.search?.trim();

	if (searchText) {
		const search: RegExp = new RegExp(escapeRegExp(searchText), 'i');

		filter.$or = [{ title: search }, { text: search }];
	}

	if (filters.status?.length) {
		filter.status = { $in: filters.status };
	}

	const startDate: Date | null = toValidDate(filters.rangeDate?.startDate);
	const endDate: Date | null = toValidDate(filters.rangeDate?.endDate);

	if (startDate || endDate) {
		filter.date = {
			...(startDate ? { $gte: startDate } : {}),
			...(endDate ? { $lte: endDate } : {}),
		};
	}

	if (filters.tagsIds?.length) {
		filter.tagsIds = { $in: filters.tagsIds };
	}

	if (filters.categoriesIds?.length) {
		filter.categoriesIds = { $in: filters.categoriesIds };
	}

	if (filters.customerIds?.length) {
		filter.customerIds = { $in: filters.customerIds };
	}

	if (filters.saleIds?.length) {
		filter.saleIds = { $in: filters.saleIds };
	}

	if (filters.storeIds?.length) {
		filter.storeIds = { $in: filters.storeIds };
	}

	return filter;
};
