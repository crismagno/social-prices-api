namespace SocketsEnum {
	export const EventNames = {
		// Customers
		UPLOAD_CUSTOMERS_RESPONSE_TO_EMPLOYEE: (employeeId: string) =>
			`upload-customers-response-to-employee-${employeeId}`,
		RESPONSE_UPLOAD_CUSTOMERS_FILE_TO_USER: (userId: string) =>
			`response-upload-customers-file-to-user-${userId}`,

		// Employees
		UPLOAD_EMPLOYEES_RESPONSE_TO_EMPLOYEE: (employeeId: string) =>
			`upload-employees-response-to-employee-${employeeId}`,
		RESPONSE_UPLOAD_EMPLOYEES_FILE_TO_USER: (userId: string) =>
			`response-upload-employees-file-to-user-${userId}`,

		// Products
		UPLOAD_PRODUCTS_RESPONSE_TO_EMPLOYEE: (employeeId: string) =>
			`upload-products-response-to-employee-${employeeId}`,
		RESPONSE_UPLOAD_PRODUCTS_FILE_TO_USER: (userId: string) =>
			`response-upload-products-file-to-user-${userId}`,
	};
}

export default SocketsEnum;
