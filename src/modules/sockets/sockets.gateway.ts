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
import { IFileUploadTemplateError } from '../files-uploads/interfaces/files-uploads.type';

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
}
