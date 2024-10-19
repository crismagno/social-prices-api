import * as moment from 'moment';

import DatesEnum from './dates.enum';

export function parseToDate(date: Date | string): Date {
	const valueToDate = new Date(date);
	let parsedDate: Date | undefined;

	if (!Number.isNaN(valueToDate.getTime())) {
		parsedDate = valueToDate;
	}

	const parsedBirthDate: moment.Moment = moment.utc(
		date,
		DatesEnum.ValidBirthDateFormat,
		true,
	);

	if (parsedBirthDate.isValid()) {
		parsedDate = parsedBirthDate.toDate();
	}

	if (parsedDate) {
		return parsedDate;
	}

	return null;
}
