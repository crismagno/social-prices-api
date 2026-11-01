import { randomInt } from 'crypto';

import { Injectable, Logger } from '@nestjs/common';

import { InboxConversationsService } from '../../inbox/inbox-conversations.service';
import { InboxMessagesService } from '../../inbox/inbox-messages.service';
import InboxEnum from '../../inbox/interfaces/inbox.enum';
import {
	IConversationKey,
	IInboxConversation,
	IInboxMessage,
} from '../../inbox/interfaces/inbox.types';
import { UsersService } from '../../users/users.service';
import { AppsRealtimeGateway } from '../core/realtime/apps-realtime.gateway';
import AppsEnum from '../interfaces/apps.enum';
import { IAppContext } from '../interfaces/apps.types';
import { IWhatsappConnection } from './whatsapp-connection.interface';
import { WhatsappConnectionsService } from './whatsapp-connections.service';
import {
	WhatsappAttachmentNotFoundException,
	WhatsappChatNotFoundException,
	WhatsappChatUnavailableException,
	WhatsappConnectFailedException,
	WhatsappConnectionRevokedException,
	WhatsappNotConfiguredException,
	WhatsappNotConnectedException,
	WhatsappNumberAlreadyConnectedException,
	WhatsappReplyWindowClosedException,
	WhatsappSubscribeFailedException,
} from './whatsapp.exceptions';
import { graphVersion, WhatsappGraphClient } from './whatsapp.graph-client';
import {
	contactOf,
	inboxInputOf,
	kindOf,
	previewOf,
} from './whatsapp.inbox-mapper';
import { parseWhatsappWebhook } from './whatsapp.update-parser';
import {
	INormalizedWhatsappMessage,
	IWhatsappConnectConfig,
	IWhatsappNumber,
	IWhatsappUploadFile,
	WhatsappApiError,
} from './whatsapp.types';

// WhatsApp only allows answering a person for 24 hours after their last message.
export const REPLY_WINDOW_MS: number = 24 * 60 * 60 * 1000;

// Meta error codes that say why a message could not be delivered.
const META_CODE_TOKEN_INVALID: number = 190;
const META_CODE_OUTSIDE_WINDOW: number = 131047;
const META_CODE_UNDELIVERABLE: number = 131026;

/** What the owner of the number sees about the connection. Never a token. */
export interface IWhatsappConnectionView {
	connected: boolean;
	status: AppsEnum.ConnectionStatus | null;
	phoneNumberId: string | null;
	displayPhoneNumber: string | null;
	verifiedName: string | null;
	connectedAt: Date | null;
	lastUpdateAt: Date | null;
}

const keyOf = (waId: string): IConversationKey => ({
	channel: InboxEnum.Channel.WHATSAPP,
	contactKey: waId,
});

@Injectable()
export class WhatsappService {
	public readonly appId: AppsEnum.App = AppsEnum.App.WHATSAPP;

	private readonly _logger: Logger = new Logger(WhatsappService.name);

	//#region Constructor

	constructor(
		private readonly _graphClient: WhatsappGraphClient,
		private readonly _connectionsService: WhatsappConnectionsService,
		private readonly _usersService: UsersService,
		private readonly _conversations: InboxConversationsService,
		private readonly _messages: InboxMessagesService,
		private readonly _realtime: AppsRealtimeGateway,
	) {}

	//#endregion

	//#region Connection

	/** What the browser needs to open Embedded Signup. None of it is secret. */
	public getConnectConfig(): IWhatsappConnectConfig {
		const appId: string | undefined = process.env.WHATSAPP_APP_ID;
		const configId: string | undefined = process.env.WHATSAPP_CONFIG_ID;

		if (!appId || !configId) {
			throw new WhatsappNotConfiguredException();
		}

		return { appId, configId, graphVersion: graphVersion() };
	}

	public async getConnection(
		ownerUserId: string,
	): Promise<IWhatsappConnectionView> {
		const connection: IWhatsappConnection | null =
			await this._connectionsService.findByOwner(ownerUserId);

		return this._toView(connection);
	}

	/**
	 * Finishes Embedded Signup: the browser gives the code and the ids of the
	 * business account and number the user chose. Nothing is saved unless the
	 * number can be read and the app can receive its messages.
	 */
	public async connect(
		ctx: IAppContext,
		data: { code: string; wabaId: string; phoneNumberId: string },
	): Promise<IWhatsappConnectionView> {
		let accessToken: string;
		let number: IWhatsappNumber;

		try {
			accessToken = await this._graphClient.exchangeCode(data.code);
			number = await this._graphClient.getNumber(
				accessToken,
				data.phoneNumberId,
			);
		} catch (error) {
			throw new WhatsappConnectFailedException(this._reasonOf(error));
		}

		const taken: IWhatsappConnection | null =
			await this._connectionsService.findByPhoneNumberId(data.phoneNumberId);

		if (taken && String(taken.ownerUserId) !== ctx.ownerUserId) {
			throw new WhatsappNumberAlreadyConnectedException();
		}

		try {
			await this._graphClient.subscribeApp(data.wabaId, accessToken);
		} catch (error) {
			throw new WhatsappSubscribeFailedException(this._reasonOf(error));
		}

		const pin: string = String(randomInt(100000, 1000000));

		try {
			await this._graphClient.registerNumber(
				data.phoneNumberId,
				accessToken,
				pin,
			);
		} catch (error) {
			// A number that Embedded Signup already registered refuses a second time.
			this._logger.warn(
				`Could not register a WhatsApp number (it may already be): ${this._reasonOf(
					error,
				)}`,
			);
		}

		return this._toView(
			await this._connectionsService.saveConnected(ctx.ownerUserId, {
				wabaId: data.wabaId,
				phoneNumberId: data.phoneNumberId,
				number,
				accessToken,
				pin,
			}),
		);
	}

	/** Stops receiving the number's messages and forgets the connection. The conversations stay. */
	public async disconnect(ctx: IAppContext): Promise<void> {
		const connection: IWhatsappConnection | null =
			await this._connectionsService.findWithToken(ctx.ownerUserId);

		if (!connection) {
			return;
		}

		try {
			await this._graphClient.unsubscribeApp(
				connection.wabaId,
				this._connectionsService.readToken(connection),
			);
		} catch (error) {
			// The user may already have removed the app on Meta's side.
			this._logger.warn(
				`Could not unsubscribe a WhatsApp account: ${this._reasonOf(error)}`,
			);
		}

		await this._connectionsService.deleteByOwner(ctx.ownerUserId);
	}

	//#endregion

	//#region Webhook

	/**
	 * Meta calls this for every event of every connected number. Each message is
	 * kept for the user it belongs to; one for a number nobody connected, or for a
	 * user without the app, is ignored. A storage failure is thrown so Meta
	 * delivers again.
	 */
	public async handleWebhook(body: unknown): Promise<void> {
		for (const message of parseWhatsappWebhook(body)) {
			await this._handleMessage(message);
		}
	}

	private async _handleMessage(
		message: INormalizedWhatsappMessage,
	): Promise<void> {
		const connection: IWhatsappConnection | null =
			await this._connectionsService.findByPhoneNumberId(message.phoneNumberId);

		if (!connection) {
			return;
		}

		const ownerUserId: string = String(connection.ownerUserId);

		const user = await this._usersService.findOneById(ownerUserId);

		if (!user?.enabledApps?.includes(this.appId)) {
			return;
		}

		const { conversation } = await this._conversations.ensure(
			ownerUserId,
			keyOf(message.waId),
			{ accountKey: message.phoneNumberId, contact: contactOf(message) },
		);

		const input = inboxInputOf(message);

		if (
			!(await this._messages.saveIncoming(ownerUserId, conversation, input))
		) {
			return;
		}

		await this._conversations.applyIncoming(ownerUserId, conversation._id, {
			accountKey: message.phoneNumberId,
			contact: contactOf(message),
			preview: previewOf(
				message.text,
				input.kind,
				message.type,
				InboxEnum.Direction.IN,
				message.sentAt,
			),
		});

		await this._connectionsService.touchLastUpdate(connection._id, new Date());

		this._notify(ownerUserId, message.waId);
	}

	//#endregion

	//#region Sending

	/**
	 * Answers a person through the business number. WhatsApp is asked first: if it
	 * refuses nothing is recorded as sent. The 24 hour window is checked here too,
	 * so a closed one is told apart without a round trip.
	 */
	public async sendText(
		ctx: IAppContext,
		waId: string,
		text: string,
	): Promise<IInboxMessage> {
		const { conversation, sent } = await this._deliver(
			ctx,
			waId,
			(token: string, phoneNumberId: string) =>
				this._graphClient.sendText(token, phoneNumberId, waId, text),
		);

		return await this._recordSent(ctx, conversation, {
			mid: sent.mid,
			sentAt: sent.sentAt,
			text,
			kind: InboxEnum.MessageKind.TEXT,
			channelKind: 'text',
			attachments: [],
		});
	}

	/**
	 * Sends a file or a recording. An audio carries no caption on WhatsApp, so the
	 * text, when there is one, goes as a message of its own right after it.
	 */
	public async sendMedia(
		ctx: IAppContext,
		waId: string,
		file: IWhatsappUploadFile,
		caption: string | null,
		asVoice: boolean = false,
	): Promise<IInboxMessage> {
		const { conversation, sent } = await this._deliver(
			ctx,
			waId,
			(token: string, phoneNumberId: string) =>
				this._graphClient.sendMedia(token, phoneNumberId, waId, file, caption),
		);

		const hasCaption: boolean = sent.type !== 'audio' && !!caption;

		const recorded: IInboxMessage = await this._recordSent(ctx, conversation, {
			mid: sent.mid,
			sentAt: sent.sentAt,
			text: hasCaption ? caption : null,
			kind:
				sent.type === 'audio' && asVoice
					? InboxEnum.MessageKind.VOICE
					: kindOf(sent.type, null),
			channelKind: sent.type,
			attachments: [
				{
					kind: kindOf(sent.type, null),
					mimeType: file.mimeType,
					fileName: file.fileName,
					size: file.buffer.length,
					width: null,
					height: null,
					duration: null,
					source: {
						type: InboxEnum.AttachmentSourceType.WHATSAPP_MEDIA,
						mediaId: sent.mediaId,
					},
				},
			],
		});

		if (sent.type === 'audio' && caption) {
			await this.sendText(ctx, waId, caption);
		}

		return recorded;
	}

	/** One file of a message, fetched from WhatsApp when asked for (its address expires). */
	public async getAttachment(
		ownerUserId: string,
		message: IInboxMessage,
		index: number,
	): Promise<{ buffer: Buffer; contentType: string; fileName: string | null }> {
		const attachment = message.attachments?.[index];

		if (
			!attachment ||
			attachment.source?.type !== InboxEnum.AttachmentSourceType.WHATSAPP_MEDIA
		) {
			throw new WhatsappAttachmentNotFoundException();
		}

		const connection: IWhatsappConnection | null =
			await this._connectionsService.findWithToken(ownerUserId);

		if (!connection) {
			throw new WhatsappNotConnectedException();
		}

		const token: string = this._connectionsService.readToken(connection);

		try {
			const info = await this._graphClient.getMedia(
				token,
				attachment.source.mediaId,
			);
			const file = await this._graphClient.downloadMedia(token, info.url);

			return {
				buffer: file.buffer,
				contentType: info.mimeType ?? attachment.mimeType ?? file.contentType,
				fileName: attachment.fileName,
			};
		} catch (error) {
			throw await this._translate(error, connection);
		}
	}

	//#endregion

	//#region Private Methods

	private async _deliver<T>(
		ctx: IAppContext,
		waId: string,
		send: (token: string, phoneNumberId: string) => Promise<T>,
	): Promise<{ conversation: IInboxConversation; sent: T }> {
		const connection: IWhatsappConnection | null =
			await this._connectionsService.findWithToken(ctx.ownerUserId);

		if (!connection) {
			throw new WhatsappNotConnectedException();
		}

		if (connection.status === AppsEnum.ConnectionStatus.REVOKED) {
			throw new WhatsappConnectionRevokedException();
		}

		const conversation: IInboxConversation | null =
			await this._conversations.findByKey(ctx.ownerUserId, keyOf(waId));

		if (!conversation) {
			throw new WhatsappChatNotFoundException();
		}

		if (!this._isWindowOpen(conversation)) {
			throw new WhatsappReplyWindowClosedException();
		}

		try {
			return {
				conversation,
				sent: await send(
					this._connectionsService.readToken(connection),
					connection.phoneNumberId,
				),
			};
		} catch (error) {
			throw await this._translate(error, connection);
		}
	}

	private async _recordSent(
		ctx: IAppContext,
		conversation: IInboxConversation,
		sent: {
			mid: string;
			sentAt: Date;
			text: string | null;
			kind: InboxEnum.MessageKind;
			channelKind: string;
			attachments: any[];
		},
	): Promise<IInboxMessage> {
		const saved: IInboxMessage = await this._messages.saveOutgoing(
			ctx.ownerUserId,
			conversation,
			{
				channelMessageId: sent.mid,
				kind: sent.kind,
				text: sent.text,
				attachments: sent.attachments,
				sentAt: sent.sentAt,
				sentByEmployeeId: ctx.employeeId,
				channelData: { type: sent.channelKind },
			},
		);

		await this._conversations.applyOutgoing(
			ctx.ownerUserId,
			conversation._id,
			previewOf(
				sent.text,
				sent.kind,
				sent.channelKind,
				InboxEnum.Direction.OUT,
				sent.sentAt,
			),
		);

		this._notify(ctx.ownerUserId, conversation.contactKey);

		return saved;
	}

	/** Meta's refusals the user can act on become their own answers; the rest is thrown as it came. */
	private async _translate(
		error: unknown,
		connection: IWhatsappConnection,
	): Promise<unknown> {
		if (error instanceof WhatsappApiError) {
			if (error.code === META_CODE_OUTSIDE_WINDOW) {
				return new WhatsappReplyWindowClosedException();
			}

			if (error.code === META_CODE_UNDELIVERABLE) {
				return new WhatsappChatUnavailableException(error.description);
			}

			if (error.code === META_CODE_TOKEN_INVALID) {
				await this._connectionsService.markRevoked(connection._id);

				return new WhatsappConnectionRevokedException();
			}
		}

		return error;
	}

	private _isWindowOpen(conversation: IInboxConversation): boolean {
		return (
			Date.now() - new Date(conversation.lastIncomingAt).getTime() <
			REPLY_WINDOW_MS
		);
	}

	private _reasonOf(error: unknown): string {
		return error instanceof WhatsappApiError
			? error.description
			: 'unknown error';
	}

	private _toView(
		connection: IWhatsappConnection | null,
	): IWhatsappConnectionView {
		return {
			connected:
				!!connection &&
				connection.status === AppsEnum.ConnectionStatus.CONNECTED,
			status: connection?.status ?? null,
			phoneNumberId: connection?.phoneNumberId ?? null,
			displayPhoneNumber: connection?.displayPhoneNumber ?? null,
			verifiedName: connection?.verifiedName ?? null,
			connectedAt: connection?.connectedAt ?? null,
			lastUpdateAt: connection?.lastUpdateAt ?? null,
		};
	}

	/** Tells the open pages of this account that its inbox changed. Never throws. */
	private _notify(ownerUserId: string, waId: string): void {
		this._realtime.notifyInboxUpdated(ownerUserId, this.appId, waId);
	}

	//#endregion
}
