import { Injectable, Logger } from '@nestjs/common';

import { FeatureLimitsService } from '../../feature-limits/feature-limits.service';
import FeatureLimitsEnum from '../../feature-limits/interfaces/feature-limits.enum';
import { UsersService } from '../../users/users.service';
import { AppsRealtimeGateway } from '../core/realtime/apps-realtime.gateway';
import AppsEnum from '../interfaces/apps.enum';
import { IAppContext } from '../interfaces/apps.types';
import { IInstagramChat } from './instagram-chat.interface';
import { InstagramChatsService } from './instagram-chats.service';
import { IInstagramConnection } from './instagram-connection.interface';
import { InstagramConnectionsService } from './instagram-connections.service';
import { IInstagramMessageRecord } from './instagram-message.interface';
import { InstagramMessagesService } from './instagram-messages.service';
import InstagramEnum from './instagram.enum';
import {
	InstagramAccountAlreadyConnectedException,
	InstagramAccountSubscribeFailedException,
	InstagramAttachmentNotFoundException,
	InstagramChatNotFoundException,
	InstagramChatUnavailableException,
	InstagramConnectionExpiredException,
	InstagramCustomerAlreadyLinkedException,
	InstagramCustomerNotFoundException,
	InstagramNotConnectedException,
	InstagramReplyWindowClosedException,
} from './instagram.exceptions';
import { InstagramGraphClient } from './instagram.graph-client';
import {
	IInstagramOAuthState,
	InstagramOAuthState,
} from './instagram.oauth-state';
import {
	ICustomerRef,
	InstagramCustomersRepository,
} from './instagram.customers.repository';
import { parseInstagramWebhook } from './instagram.update-parser';
import {
	IInstagramAccount,
	IInstagramProfile,
	IInstagramToken,
	INormalizedInstagramMessage,
	InstagramApiError,
} from './instagram.types';

// Instagram only allows answering a person for 24 hours after their last message.
export const REPLY_WINDOW_MS: number = 24 * 60 * 60 * 1000;

// The token lasts 60 days. Once less than half is left it is renewed, which is
// always more than the day Instagram asks a token to be old before renewing it.
const RENEW_WHEN_LEFT_MS: number = 30 * 24 * 60 * 60 * 1000;

// Meta error codes that say why a message could not be delivered.
const META_CODE_OUTSIDE_WINDOW: number = 10;
const META_CODE_PERSON_UNAVAILABLE: number = 551;

// Only a professional account can use messaging.
const PROFESSIONAL_ACCOUNT_TYPES: string[] = ['BUSINESS', 'MEDIA_CREATOR'];

// The one permission the whole app is for.
const MESSAGES_PERMISSION: string = 'instagram_business_manage_messages';

/** What the owner of the account sees about the connection. Never a token. */
export interface IInstagramConnectionView {
	connected: boolean;
	status: AppsEnum.ConnectionStatus | null;
	instagramUserId: string | null;
	username: string | null;
	name: string | null;
	profilePictureUrl: string | null;
	connectedAt: Date | null;
	lastUpdateAt: Date | null;
}

/** One row of the inbox. */
export interface IInstagramChatView {
	igsid: string;
	name: string | null;
	username: string | null;
	profilePic: string | null;
	customerId: string | null;
	customerName: string | null;
	lastMessageAt: Date;
	lastMessageText: string | null;
	lastAttachmentType: string | null;
	lastMessageDirection: InstagramEnum.Direction;
	unreadCount: number;
	/** False once 24 hours passed since the person last wrote. */
	canReply: boolean;
	replyWindowEndsAt: Date;
}

@Injectable()
export class InstagramService {
	public readonly appId: AppsEnum.App = AppsEnum.App.INSTAGRAM;

	private readonly _logger: Logger = new Logger(InstagramService.name);

	//#region Constructor

	constructor(
		private readonly _graphClient: InstagramGraphClient,
		private readonly _oauthState: InstagramOAuthState,
		private readonly _connectionsService: InstagramConnectionsService,
		private readonly _usersService: UsersService,
		private readonly _chatsService: InstagramChatsService,
		private readonly _messagesService: InstagramMessagesService,
		private readonly _customersRepository: InstagramCustomersRepository,
		private readonly _featureLimitsService: FeatureLimitsService,
		private readonly _realtime: AppsRealtimeGateway,
	) {}

	//#endregion

	//#region Connection

	public async getConnectUrl(ctx: IAppContext): Promise<string> {
		const state: string = await this._oauthState.sign({
			ownerUserId: ctx.ownerUserId,
			employeeId: ctx.employeeId,
		});

		return this._graphClient.buildAuthUrl(state);
	}

	/**
	 * Runs on the public callback, so it never throws: every failure becomes a
	 * redirect to the app page carrying a short error code the client translates.
	 */
	public async handleCallback(
		params: Record<string, string>,
	): Promise<{ redirectTo: string }> {
		if (params.error) {
			return this._redirect(
				params.error === 'access_denied' ? 'access_denied' : 'oauth_error',
			);
		}

		let state: IInstagramOAuthState;

		try {
			state = await this._oauthState.verify(params.state);
		} catch {
			return this._redirect('invalid_state');
		}

		// Instagram ends the redirect address with "#_" and some clients keep it on the code.
		const code: string = (params.code ?? '').replace(/#_$/, '');

		if (!code) {
			return this._redirect('missing_code');
		}

		try {
			const user = await this._usersService.findOneById(state.ownerUserId);

			if (!user?.enabledApps?.includes(this.appId)) {
				return this._redirect('not_enabled');
			}

			const short = await this._graphClient.exchangeCode(code);

			// The user can untick a permission on Instagram's screen; without this
			// one no message would ever arrive.
			if (
				short.permissions.length &&
				!short.permissions.includes(MESSAGES_PERMISSION)
			) {
				return this._redirect('missing_permission');
			}

			const token: IInstagramToken = await this._graphClient.extendToken(
				short.accessToken,
			);

			const account: IInstagramAccount = await this._graphClient.getAccount(
				token.accessToken,
			);

			if (!PROFESSIONAL_ACCOUNT_TYPES.includes(account.accountType)) {
				return this._redirect('not_professional');
			}

			await this._connect(state.ownerUserId, account, token);

			return this._redirect();
		} catch (error) {
			if (error instanceof InstagramAccountAlreadyConnectedException) {
				return this._redirect('account_in_use');
			}

			if (error instanceof InstagramAccountSubscribeFailedException) {
				return this._redirect('subscribe_failed');
			}

			return this._redirect('connection_failed');
		}
	}

	public async getConnection(
		ownerUserId: string,
	): Promise<IInstagramConnectionView> {
		const connection: IInstagramConnection | null =
			await this._connectionsService.findByOwner(ownerUserId);

		const { connected, status } =
			await this._connectionsService.getStatus(ownerUserId);

		return {
			connected,
			status,
			instagramUserId: connection?.instagramUserId ?? null,
			username: connection?.username ?? null,
			name: connection?.name ?? null,
			profilePictureUrl: connection?.profilePictureUrl ?? null,
			connectedAt: connection?.connectedAt ?? null,
			lastUpdateAt: connection?.lastUpdateAt ?? null,
		};
	}

	public async disconnect(ctx: IAppContext): Promise<void> {
		const connection: IInstagramConnection | null =
			await this._connectionsService.findWithToken(ctx.ownerUserId);

		if (connection && !this._connectionsService.isTokenExpired(connection)) {
			try {
				await this._graphClient.unsubscribeAccount(
					connection.instagramUserId,
					this._connectionsService.readToken(connection),
				);
			} catch {
				// an account that cannot be reached must not stop the user from disconnecting
			}
		}

		await this._connectionsService.deleteByOwner(ctx.ownerUserId);
	}

	//#endregion

	//#region Webhook

	/**
	 * Public entry for Meta (the signature was already checked). Messages of an
	 * account nobody connected, or of a user without the app, are ignored. A
	 * storage failure is thrown on purpose: Instagram then delivers the same event
	 * again.
	 */
	public async handleWebhook(body: unknown): Promise<void> {
		for (const message of parseInstagramWebhook(body)) {
			await this._handleMessage(message);
		}
	}

	//#endregion

	//#region Inbox

	public async listChats(ownerUserId: string): Promise<IInstagramChatView[]> {
		const chats: IInstagramChat[] = await this._chatsService.list(ownerUserId);

		const customerIds: string[] = [
			...new Set(
				chats
					.filter((chat: IInstagramChat) => !!chat.customerId)
					.map((chat: IInstagramChat) => String(chat.customerId)),
			),
		];

		const names: Map<string, string | null> = new Map(
			(customerIds.length
				? await this._customersRepository.findNames(ownerUserId, customerIds)
				: []
			).map((customer: ICustomerRef) => [String(customer._id), customer.name]),
		);

		return chats.map((chat: IInstagramChat) =>
			this._toChatView(
				chat,
				chat.customerId ? names.get(String(chat.customerId)) ?? null : null,
			),
		);
	}

	public async getChatMessages(
		ownerUserId: string,
		igsid: string,
		options: { limit?: number; before?: string },
	): Promise<IInstagramMessageRecord[]> {
		await this._getChatOrFail(ownerUserId, igsid);

		return await this._messagesService.listByChat(ownerUserId, igsid, options);
	}

	public async markRead(ownerUserId: string, igsid: string): Promise<void> {
		await this._getChatOrFail(ownerUserId, igsid);

		await this._chatsService.markRead(ownerUserId, igsid);

		this._notify(ownerUserId, igsid);
	}

	/**
	 * Answers a customer through the account. Instagram is asked first: if it
	 * refuses nothing is recorded as sent. The 24 hour window is checked here too,
	 * so a closed one is told apart without a round trip.
	 */
	public async sendMessage(
		ctx: IAppContext,
		igsid: string,
		text: string,
	): Promise<IInstagramMessageRecord> {
		const connection: IInstagramConnection | null =
			await this._connectionsService.findWithToken(ctx.ownerUserId);

		if (!connection) {
			throw new InstagramNotConnectedException();
		}

		const chat: IInstagramChat = await this._getChatOrFail(
			ctx.ownerUserId,
			igsid,
		);

		if (!this._isWindowOpen(chat)) {
			throw new InstagramReplyWindowClosedException();
		}

		const token: string = await this._usableToken(connection);

		let sent: { mid: string; sentAt: Date };

		try {
			sent = await this._graphClient.sendText(
				token,
				connection.instagramUserId,
				igsid,
				text,
			);
		} catch (error) {
			if (error instanceof InstagramApiError) {
				if (error.code === META_CODE_OUTSIDE_WINDOW) {
					throw new InstagramReplyWindowClosedException();
				}

				if (error.code === META_CODE_PERSON_UNAVAILABLE) {
					throw new InstagramChatUnavailableException(error.description);
				}
			}

			throw error;
		}

		const record: IInstagramMessageRecord =
			await this._messagesService.saveOutgoing(ctx.ownerUserId, {
				igsid,
				mid: sent.mid,
				text,
				sentAt: sent.sentAt,
				sentByEmployeeId: ctx.employeeId,
			});

		await this._chatsService.registerOutgoing(
			ctx.ownerUserId,
			igsid,
			text,
			sent.sentAt,
		);

		this._notify(ctx.ownerUserId, igsid);

		return record;
	}

	public async linkCustomer(
		ownerUserId: string,
		igsid: string,
		customerId: string,
	): Promise<IInstagramChatView> {
		const chat: IInstagramChat = await this._getChatOrFail(ownerUserId, igsid);

		if (chat.customerId) {
			throw new InstagramCustomerAlreadyLinkedException();
		}

		const customer: ICustomerRef | null =
			await this._customersRepository.findOwned(ownerUserId, customerId);

		if (!customer) {
			throw new InstagramCustomerNotFoundException();
		}

		await this._chatsService.setCustomer(ownerUserId, igsid, customerId);

		return this._toChatView(
			{ ...chat, customerId: customerId as any },
			customer.name,
		);
	}

	/** Makes a customer out of the person and ties the chat to it. */
	public async createCustomerFromChat(
		ownerUserId: string,
		igsid: string,
	): Promise<IInstagramChatView> {
		const chat: IInstagramChat = await this._getChatOrFail(ownerUserId, igsid);

		if (chat.customerId) {
			throw new InstagramCustomerAlreadyLinkedException();
		}

		await this._featureLimitsService.assertCanCreate(
			ownerUserId,
			FeatureLimitsEnum.Feature.CUSTOMERS,
		);

		const customer: ICustomerRef =
			await this._customersRepository.createFromChat(ownerUserId, chat);

		await this._chatsService.setCustomer(
			ownerUserId,
			igsid,
			String(customer._id),
		);

		return this._toChatView(
			{ ...chat, customerId: String(customer._id) as any },
			customer.name,
		);
	}

	/** Cuts the link; the customer stays, the history stays with the chat. */
	public async unlinkCustomer(
		ownerUserId: string,
		igsid: string,
	): Promise<IInstagramChatView> {
		const chat: IInstagramChat = await this._getChatOrFail(ownerUserId, igsid);

		await this._chatsService.setCustomer(ownerUserId, igsid, null);

		return this._toChatView({ ...chat, customerId: null }, null);
	}

	/** One file of a message, fetched from Instagram when asked for (its address expires). */
	public async getAttachment(
		ownerUserId: string,
		igsid: string,
		messageRecordId: string,
		index: number,
	): Promise<{ buffer: Buffer; contentType: string }> {
		const record: IInstagramMessageRecord | null =
			await this._messagesService.findOwned(
				ownerUserId,
				igsid,
				messageRecordId,
			);

		const attachment = record?.attachments?.[index];

		if (!attachment) {
			throw new InstagramAttachmentNotFoundException();
		}

		return await this._graphClient.fetchAttachment(attachment.url);
	}

	//#endregion

	//#region Private Methods

	/** An account belongs to one user. Instagram is asked first, so nothing is kept on a refusal. */
	private async _connect(
		ownerUserId: string,
		account: IInstagramAccount,
		token: IInstagramToken,
	): Promise<void> {
		const existing: IInstagramConnection | null =
			await this._connectionsService.findByAccountId(account.userId);

		if (existing && String(existing.ownerUserId) !== ownerUserId) {
			throw new InstagramAccountAlreadyConnectedException();
		}

		try {
			await this._graphClient.subscribeAccount(
				account.userId,
				token.accessToken,
			);
		} catch (error) {
			if (error instanceof InstagramApiError) {
				throw new InstagramAccountSubscribeFailedException(error.description);
			}

			throw error;
		}

		await this._connectionsService.saveConnected(ownerUserId, account, token);
	}

	/**
	 * The token to call Instagram with. One that ran out cannot be saved: the user
	 * connects again. One that is getting old is renewed now, while it still can be.
	 */
	private async _usableToken(
		connection: IInstagramConnection,
	): Promise<string> {
		if (this._connectionsService.isTokenExpired(connection)) {
			await this._connectionsService.markExpired(connection._id);

			throw new InstagramConnectionExpiredException();
		}

		const token: string = this._connectionsService.readToken(connection);

		const left: number =
			new Date(connection.tokenExpiresAt).getTime() - Date.now();

		if (left < RENEW_WHEN_LEFT_MS) {
			try {
				const renewed: IInstagramToken =
					await this._graphClient.refreshToken(token);

				await this._connectionsService.updateToken(connection._id, renewed);

				return renewed.accessToken;
			} catch (error) {
				// The old one still works for now; try again on the next use.
				this._logger.warn(
					`Could not renew an Instagram token: ${String(error)}`,
				);
			}
		}

		return token;
	}

	private async _handleMessage(
		message: INormalizedInstagramMessage,
	): Promise<void> {
		const connection: IInstagramConnection | null =
			await this._connectionsService.findByAccountId(message.accountId);

		if (!connection) {
			return;
		}

		const ownerUserId: string = String(connection.ownerUserId);

		const user = await this._usersService.findOneById(ownerUserId);

		if (!user?.enabledApps?.includes(this.appId)) {
			return;
		}

		if (message.direction === InstagramEnum.Direction.OUT) {
			await this._handleEcho(ownerUserId, connection, message);

			return;
		}

		if (!(await this._messagesService.saveIncoming(ownerUserId, message))) {
			return;
		}

		const isFirstMessage: boolean = await this._chatsService.registerIncoming(
			ownerUserId,
			message,
		);

		if (isFirstMessage || (await this._hasNoName(ownerUserId, message.igsid))) {
			await this._learnPerson(ownerUserId, connection, message.igsid);
		}

		await this._connectionsService.touchLastUpdate(connection._id, new Date());

		this._notify(ownerUserId, message.igsid);
	}

	/**
	 * What the account sent from the Instagram app. A reply sent from here is
	 * echoed too and is already stored: nothing more to do for it.
	 */
	private async _handleEcho(
		ownerUserId: string,
		connection: IInstagramConnection,
		message: INormalizedInstagramMessage,
	): Promise<void> {
		if (!(await this._messagesService.saveEcho(ownerUserId, message))) {
			return;
		}

		if (await this._chatsService.registerEcho(ownerUserId, message)) {
			await this._learnPerson(ownerUserId, connection, message.igsid);
		}

		this._notify(ownerUserId, message.igsid);
	}

	/** A conversation that came in with no name to show tries again on the next message. */
	private async _hasNoName(
		ownerUserId: string,
		igsid: string,
	): Promise<boolean> {
		const chat: IInstagramChat | null = await this._chatsService.findByIgsid(
			ownerUserId,
			igsid,
		);

		return !!chat && !chat.name && !chat.username;
	}

	/** The name, username and picture of the person. */
	private async _learnPerson(
		ownerUserId: string,
		connection: IInstagramConnection,
		igsid: string,
	): Promise<void> {
		if (!this._connectionsService.isTokenExpired(connection)) {
			try {
				const profile: IInstagramProfile = await this._graphClient.getProfile(
					this._connectionsService.readToken(connection),
					igsid,
				);

				if (profile.name || profile.username || profile.profilePic) {
					await this._chatsService.setProfile(ownerUserId, igsid, profile);
				}
			} catch {
				// the message is kept even when Instagram gives no profile
			}
		}
	}

	private async _getChatOrFail(
		ownerUserId: string,
		igsid: string,
	): Promise<IInstagramChat> {
		const chat: IInstagramChat | null = await this._chatsService.findByIgsid(
			ownerUserId,
			igsid,
		);

		if (!chat) {
			throw new InstagramChatNotFoundException();
		}

		return chat;
	}

	private _isWindowOpen(chat: IInstagramChat): boolean {
		return (
			Date.now() - new Date(chat.lastIncomingAt).getTime() < REPLY_WINDOW_MS
		);
	}

	/** Tells the open pages of this account that its inbox changed. Never throws. */
	private _notify(ownerUserId: string, igsid: string): void {
		this._realtime.notifyInboxUpdated(ownerUserId, this.appId, igsid);
	}

	private _toChatView(
		chat: IInstagramChat,
		customerName: string | null,
	): IInstagramChatView {
		return {
			igsid: chat.igsid,
			name: chat.name ?? null,
			username: chat.username ?? null,
			profilePic: chat.profilePic ?? null,
			customerId: chat.customerId ? String(chat.customerId) : null,
			customerName,
			lastMessageAt: chat.lastMessageAt,
			lastMessageText: chat.lastMessageText ?? null,
			lastAttachmentType: chat.lastAttachmentType ?? null,
			lastMessageDirection: chat.lastMessageDirection,
			unreadCount: chat.unreadCount ?? 0,
			canReply: this._isWindowOpen(chat),
			replyWindowEndsAt: new Date(
				new Date(chat.lastIncomingAt).getTime() + REPLY_WINDOW_MS,
			),
		};
	}

	/** Targets are built server-side from SOCIAL_PRICES_URL: no open redirect. */
	private _redirect(errorCode?: string): { redirectTo: string } {
		const base: string = (process.env.SOCIAL_PRICES_URL ?? '').replace(
			/\/+$/,
			'',
		);
		const path: string = `${base}/apps/instagram`;

		return { redirectTo: errorCode ? `${path}?error=${errorCode}` : path };
	}

	//#endregion
}
