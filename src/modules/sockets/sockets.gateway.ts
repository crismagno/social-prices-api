import { Server, Socket } from 'socket.io';

import {
	MessageBody,
	OnGatewayConnection,
	OnGatewayDisconnect,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
} from '@nestjs/websockets';

import { ICustomerUploadTemplateFileError } from '../customers/interfaces/customers.type';

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

	@SubscribeMessage('sendUploadCustomersToEmployee')
	handleUploadCustomersResponseToEmployee(
		@MessageBody()
		data: ICustomerUploadTemplateFileError[],
		employeeId: string,
	): void {
		this.server.emit(
			`upload-customers-response-to-employee-${employeeId}`,
			data,
		);
	}
}
