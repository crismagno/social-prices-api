export interface IFindByOwnerUserIdAndPropertiesParams {
	ownerUserId: string;
	email: string;
	name: string;
	birthDate: Date | null;
}

export interface ICustomerFileUploadTemplateRow {
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
