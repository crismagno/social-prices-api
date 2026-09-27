import NotesEnum from './interfaces/notes.enum';
import { INoteCalendarMarker } from './interfaces/notes.types';

export interface ICalendarCountRow {
	_id: { date: string; status: string };
	count: number;
	colors: (string | null)[];
}

export const shapeCalendarMarkers = (
	rows: ICalendarCountRow[],
): INoteCalendarMarker[] => {
	const byDate: Map<string, INoteCalendarMarker> = new Map();

	for (const row of rows) {
		const marker: INoteCalendarMarker = byDate.get(row._id.date) ?? {
			date: row._id.date,
			pending: 0,
			completed: 0,
			cancelled: 0,
			colors: [],
		};

		if (row._id.status === NotesEnum.Status.PENDING) {
			marker.pending += row.count;
		} else if (row._id.status === NotesEnum.Status.COMPLETED) {
			marker.completed += row.count;
		} else {
			marker.cancelled += row.count;
		}

		for (const color of row.colors ?? []) {
			if (color && !marker.colors.includes(color)) {
				marker.colors.push(color);
			}
		}

		byDate.set(row._id.date, marker);
	}

	return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
};
