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
			`upload-customers-response-to-employee-${employeeId}`,
			data,
		);
	}

	@SubscribeMessage('responseFromUploadCustomersFile')
	handleResponseUploadCustomersFileToUser(
		@MessageBody()
		userId: string,
	): void {
		this.server.emit(`response-upload-customers-file-to-user-${userId}`);
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
			`upload-employees-response-to-employee-${employeeId}`,
			data,
		);
	}

	@SubscribeMessage('responseFromUploadEmployeesFile')
	handleResponseUploadEmployeesFileToUser(
		@MessageBody()
		userId: string,
	): void {
		this.server.emit(`response-upload-employees-file-to-user-${userId}`);
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
			`upload-products-response-to-employee-${employeeId}`,
			data,
		);
	}

	@SubscribeMessage('responseFromUploadProductsFile')
	handleResponseUploadProductsFileToUser(
		@MessageBody()
		userId: string,
	): void {
		this.server.emit(`response-upload-products-file-to-user-${userId}`);
	}

	//#endregion
}
