import { Server, Socket } from 'socket.io';

import {
	MessageBody,
	OnGatewayConnection,
	OnGatewayDisconnect,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
} from '@nestjs/websockets';

@WebSocketGateway({
	cors: {
		origin: '*',
	},
	// transports: ['websocket'],
	transports: ['websocket', 'polling'],
})
export class SocketsGateway
	implements OnGatewayConnection, OnGatewayDisconnect
{
	@WebSocketServer()
	server: Server;

	handleConnection(client: Socket) {
		console.log(`Client connected: ${client.id}`);
		this.server.emit('message', 'A new client has connected');
	}

	handleDisconnect(client: Socket) {
		console.log(`Client disconnected: ${client.id}`);
	}

	@SubscribeMessage('sendMessage')
	handleMessage(@MessageBody() message: string): void {
		console.log(`Message received: ${message}`);
		// Envia o evento 'message' com o conteúdo recebido para todos os clientes conectados
		this.server.emit('message', message);
	}
}
