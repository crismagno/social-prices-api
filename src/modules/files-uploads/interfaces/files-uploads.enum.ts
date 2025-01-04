namespace FilesUploadsEnum {
	export enum Type {
		UPLOAD_CUSTOMERS = 'UPLOAD_CUSTOMERS',
		UPLOAD_PRODUCTS = 'UPLOAD_PRODUCTS',
	}

	export enum Status {
		PENDING = 'PENDING',
		PROCESSING = 'PROCESSING',
		COMPLETED = 'COMPLETED',
		ERROR = 'ERROR',
	}
}

export default FilesUploadsEnum;
