export interface IFindByOwnerUserIdAndPropertiesParams {
	ownerUserId: string;
	email: string;
	name: string;
	birthDate: Date | null;
}

export interface ICustomerUploadTemplateRow {
	'Name *': string;
	Email?: string;
	'Birth Date'?: string;
	Gender?: string;
	Tags?: string;
	About?: string;
	Country?: string;
	State?: string;
	City?: string;
	'Zip Code'?: string | number;
	Address1?: string;
	Address2?: string;
	District?: string;
	'Address Description'?: string;
	'Address Types'?: string;
	'Phone Type'?: string;
	'Phone Number'?: string | number;
	'Phone Messengers'?: string;
}

export interface ICustomerUploadTemplateFileError {
	filename: string;
	fileNumber: number;
	rowsError: ICustomerUploadTemplateRowError[];
	processError?: any;
}

export interface ICustomerUploadTemplateRowError {
	rowNumber: number;
	reasons: ICustomerUploadTemplateRowErrorReason[];
}

export interface ICustomerUploadTemplateRowErrorReason {
	property: keyof ICustomerUploadTemplateRow;
	message: string;
}
