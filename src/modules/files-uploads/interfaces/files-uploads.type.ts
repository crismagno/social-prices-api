export type IFileUploadTemplateErrorRowPropertyKeys<T> = keyof T | 'other';

export interface IFileUploadTemplateError<T> {
	filename: string;
	fileNumber: number;
	rowsError: IFileUploadTemplateErrorRow<T>[];
	processError?: string;
	fileColumns: any;
}

export interface IFileUploadTemplateErrorRow<T> {
	rowNumber: number;
	reasons: IFileUploadTemplateRowErrorReason<T>[];
}

export interface IFileUploadTemplateRowErrorReason<T> {
	property: IFileUploadTemplateErrorRowPropertyKeys<T>;
	message: string;
}
