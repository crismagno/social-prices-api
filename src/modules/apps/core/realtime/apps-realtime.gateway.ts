import { Server, Socket } from 'socket.io';

import { Injectable, Logger } from '@nestjs/common';
import {
	ConnectedSocket,
	MessageBody,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
} from '@nestjs/websockets';

import AuthorizationToken from '../../../../infra/authorization/authorization-token';
import AuthEnum from '../../../auth/interfaces/auth.enum';
import AppsEnum from '../../interfaces/apps.enum';
import {
	APPS_ROOM_PREFIX,
	AppsRealtimeEvents,
	appsRoomOf,
} from './apps-realtime.events';

/**
 * Pushes "something changed in your inbox" to the browsers of the account the
 * moment a message arrives, instead of waiting for them to ask. Unlike the older
 * events, which every connected client hears, this one goes through a room per
 * account that is only joined with a valid login token. It carries no message
 * content: the browser asks the API, which checks who is asking.
 */
@Injectable()
@WebSocketGateway({
	cors: { origin: '*' },
	transports: ['websocket', 'polling'],
})
export class AppsRealtimeGateway {
	private readonly _logger: Logger = new Logger(AppsRealtimeGateway.name);

	@WebSocketServer()
	server: Server;

	constructor(private readonly _authorizationToken: AuthorizationToken) {}

	@SubscribeMessage(AppsRealtimeEvents.SUBSCRIBE)
	public async handleSubscribe(
		@ConnectedSocket() client: Socket,
		@MessageBody() body: { token?: unknown },
	): Promise<{ ok: boolean }> {
		const token: unknown = body?.token;

		if (typeof token !== 'string' || !token) {
			return { ok: false };
		}

		// One account at a time: a connection that subscribes again, whatever the
		// outcome, no longer hears the last one.
		this._leaveAppsRooms(client);

		try {
			const payload = await this._authorizationToken.getToken<{
				_id?: string;
				type?: AuthEnum.PayloadType;
			}>(token);

			if (
				!payload?._id ||
				(payload.type ?? AuthEnum.PayloadType.USER) !==
					AuthEnum.PayloadType.USER
			) {
				return { ok: false };
			}

			await client.join(appsRoomOf(String(payload._id)));

			return { ok: true };
		} catch {
			return { ok: false };
		}
	}

	@SubscribeMessage(AppsRealtimeEvents.UNSUBSCRIBE)
	public handleUnsubscribe(@ConnectedSocket() client: Socket): { ok: boolean } {
		this._leaveAppsRooms(client);

		return { ok: true };
	}

	/** Never throws: a socket problem must not break a webhook or a reply. */
	public notifyInboxUpdated(
		ownerUserId: string,
		app: AppsEnum.App,
		chatKey: string,
	): void {
		try {
			this.server
				.to(appsRoomOf(ownerUserId))
				.emit(AppsRealtimeEvents.INBOX_UPDATED, { app, chatKey });
		} catch (error) {
			this._logger.warn(`Could not push the inbox update: ${String(error)}`);
		}
	}

	private _leaveAppsRooms(client: Socket): void {
		for (const room of Array.from(client.rooms ?? [])) {
			if (room.startsWith(APPS_ROOM_PREFIX)) {
				client.leave(room);
			}
		}
	}
}
