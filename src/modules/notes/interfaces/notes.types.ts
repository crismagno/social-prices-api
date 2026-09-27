import NotesEnum from './notes.enum';

export interface INoteFilters {
	status?: NotesEnum.Status[];
	rangeDate?: {
		startDate?: string | Date | null;
		endDate?: string | Date | null;
	};
	tagsIds?: string[];
	categoriesIds?: string[];
	customerIds?: string[];
	saleIds?: string[];
	storeIds?: string[];
}

export interface INoteCalendarMarkersRequest {
	search?: string;
	filters?: INoteFilters;
	monthStart: string;
	monthEnd: string;
}

export interface INoteCalendarMarker {
	date: string;
	pending: number;
	completed: number;
	cancelled: number;
	colors: string[];
}
