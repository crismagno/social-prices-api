export interface IFindByOwnerUserIdAndPropertiesParams {
	ownerUserId: string;
	email: string;
	name: string;
	birthDate: Date | null;
}

export interface ICustomerUploadTemplateRow {
	rowNumber: number;
	name: string;
	email?: string;
	birthDate?: string;
	gender?: string;
	tags?: string;
	about?: string;
	country?: string;
	state?: string;
	city?: string;
	zipCode?: string | number;
	address1?: string;
	address2?: string;
	district?: string;
	addressDescription?: string;
	addressTypes?: string;
	phoneType?: string;
	phoneNumber?: string | number;
	phoneMessengers?: string;
}

export interface ICustomerUploadTemplateFileError {
	filename: string;
	fileNumber: number;
	rowsError: ICustomerUploadTemplateRowError[];
	processError?: string;
}

export interface ICustomerUploadTemplateRowError {
	rowNumber: number;
	reasons: ICustomerUploadTemplateRowErrorReason[];
}

export type CustomerUploadTemplateRowErrorPropertyKeys =
	| keyof ICustomerUploadTemplateRow
	| 'other';

export interface ICustomerUploadTemplateRowErrorReason {
	property: CustomerUploadTemplateRowErrorPropertyKeys;
	message: string;
}
