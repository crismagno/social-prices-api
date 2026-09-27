import NotesEnum from './notes.enum';

export interface INote {
	readonly _id: string;
	userId: string;
	createdByUserId: string;
	createdByEmployeeId: string | null;
	title: string;
	text: string;
	color: string | null;
	date: Date;
	status: NotesEnum.Status;
	tagsIds: string[];
	categoriesIds: string[];
	customerIds: string[];
	saleIds: string[];
	storeIds: string[];
	createdAt: Date;
	updatedAt: Date;
}
