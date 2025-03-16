namespace FilesUploadsEnum {
	export enum Type {
		UPLOAD_CUSTOMERS = 'UPLOAD_CUSTOMERS',
		UPLOAD_PRODUCTS = 'UPLOAD_PRODUCTS',
		UPLOAD_EMPLOYEES = 'UPLOAD_EMPLOYEES',
		UPLOAD_SALES = 'UPLOAD_SALES',
	}

	export enum Status {
		PENDING = 'PENDING',
		PROCESSING = 'PROCESSING',
		COMPLETED = 'COMPLETED',
		ERROR = 'ERROR',
	}
}

export default FilesUploadsEnum;
