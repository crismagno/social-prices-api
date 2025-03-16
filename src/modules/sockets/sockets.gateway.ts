import { Server, Socket } from 'socket.io';

import {
	MessageBody,
	OnGatewayConnection,
	OnGatewayDisconnect,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
} from '@nestjs/websockets';

import { ICustomerFileUploadTemplateRow } from '../customers/interfaces/customers.type';
import { IEmployeeFileUploadTemplateRow } from '../employees/interfaces/employees.types';
import { IFileUploadTemplateError } from '../files-uploads/interfaces/files-uploads.type';
import { IProductFileUploadTemplateRow } from '../products/interfaces/products.type';
import { ISaleFileUploadTemplateRow } from '../sales/interfaces/sales.type';
import SocketsEnum from './interfaces/sockets.enum';

@WebSocketGateway({
	cors: {
		origin: '*',
	},
	transports: ['websocket', 'polling'],
})
export class SocketsGateway
	implements OnGatewayConnection, OnGatewayDisconnect
{
	@WebSocketServer()
	server: Server;

	handleConnection(client: Socket) {
		console.log(`Client connected: ${client.id}`);
	}

	handleDisconnect(client: Socket) {
		console.log(`Client disconnected: ${client.id}`);
	}

	//#region Customers

	@SubscribeMessage('uploadCustomersResponseToEmployee')
	handleUploadCustomersResponseToEmployee(
		@MessageBody()
		data: IFileUploadTemplateError<ICustomerFileUploadTemplateRow>[],
		employeeId: string,
	): void {
		this.server.emit(
			SocketsEnum.EventNames.UPLOAD_CUSTOMERS_RESPONSE_TO_EMPLOYEE(employeeId),
			data,
		);

		this.server.emit;
	}

	@SubscribeMessage('responseFromUploadCustomersFile')
	handleResponseUploadCustomersFileToUser(
		@MessageBody()
		userId: string,
	): void {
		this.server.emit(
			SocketsEnum.EventNames.RESPONSE_UPLOAD_CUSTOMERS_FILE_TO_USER(userId),
		);
	}

	//#endregion

	//#region Employees

	@SubscribeMessage('uploadEmployeesResponseToEmployee')
	handleUploadEmployeesResponseToEmployee(
		@MessageBody()
		data: IFileUploadTemplateError<IEmployeeFileUploadTemplateRow>[],
		employeeId: string,
	): void {
		this.server.emit(
			SocketsEnum.EventNames.UPLOAD_EMPLOYEES_RESPONSE_TO_EMPLOYEE(employeeId),
			data,
		);
	}

	@SubscribeMessage('responseFromUploadEmployeesFile')
	handleResponseUploadEmployeesFileToUser(
		@MessageBody()
		userId: string,
	): void {
		this.server.emit(
			SocketsEnum.EventNames.RESPONSE_UPLOAD_EMPLOYEES_FILE_TO_USER(userId),
		);
	}

	//#endregion

	//#region Products

	@SubscribeMessage('uploadProductsResponseToEmployee')
	handleUploadProductsResponseToEmployee(
		@MessageBody()
		data: IFileUploadTemplateError<IProductFileUploadTemplateRow>[],
		employeeId: string,
	): void {
		this.server.emit(
			SocketsEnum.EventNames.UPLOAD_PRODUCTS_RESPONSE_TO_EMPLOYEE(employeeId),
			data,
		);
	}

	@SubscribeMessage('responseFromUploadProductsFile')
	handleResponseUploadProductsFileToUser(
		@MessageBody()
		userId: string,
	): void {
		this.server.emit(
			SocketsEnum.EventNames.RESPONSE_UPLOAD_PRODUCTS_FILE_TO_USER(userId),
		);
	}

	//#endregion

	//#region Sales

	@SubscribeMessage('uploadSalesResponseToEmployee')
	handleUploadSalesResponseToEmployee(
		@MessageBody()
		data: IFileUploadTemplateError<ISaleFileUploadTemplateRow>[],
		employeeId: string,
	): void {
		this.server.emit(
			SocketsEnum.EventNames.UPLOAD_SALES_RESPONSE_TO_EMPLOYEE(employeeId),
			data,
		);
	}

	@SubscribeMessage('responseFromUploadSalesFile')
	handleResponseUploadSalesFileToUser(
		@MessageBody()
		userId: string,
	): void {
		this.server.emit(
			SocketsEnum.EventNames.RESPONSE_UPLOAD_SALES_FILE_TO_USER(userId),
		);
	}

	//#endregion
}
