import * as moment from 'moment';

import DatesEnum from './dates.enum';

export function parseToDate(date: Date | string): Date | null {
	if (!date) {
		return null;
	}

	if (date instanceof Date) {
		return !isNaN(date.getTime()) ? date : null;
	}

	if (typeof date === 'string') {
		const parsedDate = moment(date);

		if (parsedDate.isValid()) {
			return parsedDate.toDate();
		}

		const parsedDateWithFormat = moment.utc(
			date,
			DatesEnum.ValidDateFormat,
			true,
		);

		if (parsedDateWithFormat.isValid()) {
			return parsedDateWithFormat.toDate();
		}
	}

	return null;
}
