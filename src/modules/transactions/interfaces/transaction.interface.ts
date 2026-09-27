import TransactionsEnum from './transactions.enum';

export interface ITransaction {
	readonly _id: string;
	userId: string;
	createdByUserId: string;
	createdByEmployeeId: string | null;
	name: string;
	type: TransactionsEnum.Type;
	value: number;
	status: TransactionsEnum.Status;
	note: string | null;
	tagsIds: string[];
	categoriesIds: string[];
	storeIds: string[];
	createdDate: Date;
	createdAt: Date;
	updatedAt: Date;
}
