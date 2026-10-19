import { Injectable, Logger } from '@nestjs/common';

import { FeatureLimitsService } from '../../feature-limits/feature-limits.service';
import FeatureLimitsEnum from '../../feature-limits/interfaces/feature-limits.enum';
import { UsersService } from '../../users/users.service';
import AppsEnum from '../interfaces/apps.enum';
import { IAppContext } from '../interfaces/apps.types';
import { IMessengerChat } from './messenger-chat.interface';
import { MessengerChatsService } from './messenger-chats.service';
import { IMessengerConnection } from './messenger-connection.interface';
import { MessengerConnectionsService } from './messenger-connections.service';
import { IMessengerMessageRecord } from './messenger-message.interface';
import { MessengerMessagesService } from './messenger-messages.service';
import {
	ICustomerRef,
	MessengerCustomersRepository,
} from './messenger.customers.repository';
import {
	MessengerAttachmentNotFoundException,
	MessengerChatNotFoundException,
	MessengerChatUnavailableException,
	MessengerCustomerAlreadyLinkedException,
	MessengerCustomerNotFoundException,
	MessengerNotConnectedException,
	MessengerReplyWindowClosedException,
	MessengerPageAlreadyConnectedException,
	MessengerPageNotAvailableException,
	MessengerPageSubscribeFailedException,
} from './messenger.exceptions';
import { LOGIN_SCOPES, MessengerGraphClient } from './messenger.graph-client';
import {
	IMessengerOAuthState,
	MessengerOAuthState,
} from './messenger.oauth-state';
import MessengerEnum from './messenger.enum';
import { parseMessengerWebhook } from './messenger.update-parser';
import {
	IMetaPage,
	IMetaProfile,
	INormalizedMessengerMessage,
	MetaApiError,
} from './messenger.types';

// Facebook only allows answering a person for 24 hours after their last message.
const REPLY_WINDOW_MS: number = 24 * 60 * 60 * 1000;

// Meta error codes that say why a message could not be delivered.
const META_CODE_OUTSIDE_WINDOW: number = 10;
const META_CODE_PERSON_UNAVAILABLE: number = 551;

/** What the owner of the Page sees about the connection. Never a token. */
export interface IMessengerConnectionView {
	connected: boolean;
	pageId: string | null;
	pageName: string | null;
	connectedAt: Date | null;
	lastUpdateAt: Date | null;
	/** Pages still to choose from after the login; empty once one is connected. */
	pendingPages: { pageId: string; pageName: string }[];
}

/** One row of the inbox. */
export interface IMessengerChatView {
	psid: string;
	name: string | null;
	profilePic: string | null;
	customerId: string | null;
	customerName: string | null;
	lastMessageAt: Date;
	lastMessageText: string | null;
	lastAttachmentType: string | null;
	lastMessageDirection: MessengerEnum.Direction;
	unreadCount: number;
	/** False once 24 hours passed since the person last wrote. */
	canReply: boolean;
	replyWindowEndsAt: Date;
}

@Injectable()
export class MessengerService {
	public readonly appId: AppsEnum.App = AppsEnum.App.FACEBOOK;

	private readonly _logger: Logger = new Logger(MessengerService.name);

	//#region Constructor

	constructor(
		private readonly _graphClient: MessengerGraphClient,
		private readonly _oauthState: MessengerOAuthState,
		private readonly _connectionsService: MessengerConnectionsService,
		private readonly _usersService: UsersService,
		private readonly _chatsService: MessengerChatsService,
		private readonly _messagesService: MessengerMessagesService,
		private readonly _customersRepository: MessengerCustomersRepository,
		private readonly _featureLimitsService: FeatureLimitsService,
	) {}

	//#endregion

	//#region Public Methods

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

		let state: IMessengerOAuthState;

		try {
			state = await this._oauthState.verify(params.state);
		} catch {
			return this._redirect('invalid_state');
		}

		if (!params.code) {
			return this._redirect('missing_code');
		}

		try {
			const user = await this._usersService.findOneById(state.ownerUserId);

			if (!user?.enabledApps?.includes(this.appId)) {
				return this._redirect('not_enabled');
			}

			const userToken: string = await this._graphClient.extendToken(
				await this._graphClient.exchangeCode(params.code),
			);

			const pages: IMetaPage[] = await this._graphClient.listPages(userToken);

			if (!pages.length) {
				return this._redirect(await this._whyNoPages(userToken));
			}

			if (pages.length > 1) {
				await this._connectionsService.savePending(state.ownerUserId, pages);

				return this._redirect(undefined, 'select=1');
			}

			await this._connect(state.ownerUserId, pages[0]);

			return this._redirect();
		} catch (error) {
			if (error instanceof MessengerPageAlreadyConnectedException) {
				return this._redirect('page_in_use');
			}

			if (error instanceof MessengerPageSubscribeFailedException) {
				return this._redirect('subscribe_failed');
			}

			return this._redirect('connection_failed');
		}
	}

	public async getConnection(
		ownerUserId: string,
	): Promise<IMessengerConnectionView> {
		const connection: IMessengerConnection | null =
			await this._connectionsService.findByOwner(ownerUserId);

		const isConnected: boolean =
			!!connection?.pageId &&
			connection.status === AppsEnum.ConnectionStatus.CONNECTED;

		return {
			connected: isConnected,
			pageId: connection?.pageId ?? null,
			pageName: connection?.pageName ?? null,
			connectedAt: connection?.connectedAt ?? null,
			lastUpdateAt: connection?.lastUpdateAt ?? null,
			pendingPages: isConnected
				? []
				: await this._connectionsService.listPending(ownerUserId),
		};
	}

	/** The user picked one of the Pages the login brought. */
	public async selectPage(ctx: IAppContext, pageId: string): Promise<void> {
		const page: IMetaPage | null = await this._connectionsService.findPending(
			ctx.ownerUserId,
			pageId,
		);

		if (!page) {
			throw new MessengerPageNotAvailableException();
		}

		await this._connect(ctx.ownerUserId, page);
	}

	public async disconnect(ctx: IAppContext): Promise<void> {
		const connection: IMessengerConnection | null =
			await this._connectionsService.findWithToken(ctx.ownerUserId);

		if (connection) {
			try {
				await this._graphClient.unsubscribePage(
					connection.pageId,
					this._connectionsService.readToken(connection),
				);
			} catch {
				// a Page that cannot be reached must not stop the user from disconnecting
			}
		}

		await this._connectionsService.deleteByOwner(ctx.ownerUserId);
	}

	/**
	 * Public entry for Meta (the signature was already checked). Messages of a
	 * Page nobody connected, or of a user without the app, are ignored. A storage
	 * failure is thrown on purpose: Facebook then delivers the same event again.
	 */
	public async handleWebhook(body: unknown): Promise<void> {
		for (const message of parseMessengerWebhook(body)) {
			await this._handleMessage(message);
		}
	}

	public async listChats(ownerUserId: string): Promise<IMessengerChatView[]> {
		const chats: IMessengerChat[] = await this._chatsService.list(ownerUserId);

		const customerIds: string[] = [
			...new Set(
				chats
					.filter((chat: IMessengerChat) => !!chat.customerId)
					.map((chat: IMessengerChat) => String(chat.customerId)),
			),
		];

		const names: Map<string, string | null> = new Map(
			(customerIds.length
				? await this._customersRepository.findNames(ownerUserId, customerIds)
				: []
			).map((customer: ICustomerRef) => [String(customer._id), customer.name]),
		);

		return chats.map((chat: IMessengerChat) =>
			this._toChatView(
				chat,
				chat.customerId ? names.get(String(chat.customerId)) ?? null : null,
			),
		);
	}

	public async getChatMessages(
		ownerUserId: string,
		psid: string,
		options: { limit?: number; before?: string },
	): Promise<IMessengerMessageRecord[]> {
		await this._getChatOrFail(ownerUserId, psid);

		return await this._messagesService.listByChat(ownerUserId, psid, options);
	}

	public async markRead(ownerUserId: string, psid: string): Promise<void> {
		await this._getChatOrFail(ownerUserId, psid);

		await this._chatsService.markRead(ownerUserId, psid);
	}

	/**
	 * Answers a customer through the Page. Facebook is asked first: if it refuses
	 * nothing is recorded as sent. The 24 hour window is checked here too, so a
	 * closed one is told apart without a round trip.
	 */
	public async sendMessage(
		ctx: IAppContext,
		psid: string,
		text: string,
	): Promise<IMessengerMessageRecord> {
		const connection: IMessengerConnection | null =
			await this._connectionsService.findWithToken(ctx.ownerUserId);

		if (!connection) {
			throw new MessengerNotConnectedException();
		}

		const chat: IMessengerChat = await this._getChatOrFail(
			ctx.ownerUserId,
			psid,
		);

		if (!this._isWindowOpen(chat)) {
			throw new MessengerReplyWindowClosedException();
		}

		let sent: { mid: string; sentAt: Date };

		try {
			sent = await this._graphClient.sendText(
				this._connectionsService.readToken(connection),
				psid,
				text,
			);
		} catch (error) {
			if (error instanceof MetaApiError) {
				if (error.code === META_CODE_OUTSIDE_WINDOW) {
					throw new MessengerReplyWindowClosedException();
				}

				if (error.code === META_CODE_PERSON_UNAVAILABLE) {
					throw new MessengerChatUnavailableException(error.description);
				}
			}

			throw error;
		}

		const record: IMessengerMessageRecord =
			await this._messagesService.saveOutgoing(ctx.ownerUserId, {
				psid,
				mid: sent.mid,
				text,
				sentAt: sent.sentAt,
				sentByEmployeeId: ctx.employeeId,
			});

		await this._chatsService.registerOutgoing(
			ctx.ownerUserId,
			psid,
			text,
			sent.sentAt,
		);

		return record;
	}

	public async linkCustomer(
		ownerUserId: string,
		psid: string,
		customerId: string,
	): Promise<IMessengerChatView> {
		const chat: IMessengerChat = await this._getChatOrFail(ownerUserId, psid);

		if (chat.customerId) {
			throw new MessengerCustomerAlreadyLinkedException();
		}

		const customer: ICustomerRef | null =
			await this._customersRepository.findOwned(ownerUserId, customerId);

		if (!customer) {
			throw new MessengerCustomerNotFoundException();
		}

		if (
			!(await this._customersRepository.linkMessengerSource(
				ownerUserId,
				customerId,
				psid,
			))
		) {
			throw new MessengerCustomerAlreadyLinkedException();
		}

		await this._chatsService.setCustomer(ownerUserId, psid, customerId);

		return this._toChatView(
			{ ...chat, customerId: customerId as any },
			customer.name,
		);
	}

	/**
	 * Makes a customer out of the person. If that person already is a customer
	 * (after an unlink, or from before) that one is used, so there is never a
	 * second customer for the same person and no plan limit is spent.
	 */
	public async createCustomerFromChat(
		ownerUserId: string,
		psid: string,
	): Promise<IMessengerChatView> {
		const chat: IMessengerChat = await this._getChatOrFail(ownerUserId, psid);

		if (chat.customerId) {
			throw new MessengerCustomerAlreadyLinkedException();
		}

		let customer: ICustomerRef | null =
			await this._customersRepository.findByPsid(ownerUserId, psid);

		if (!customer) {
			await this._featureLimitsService.assertCanCreate(
				ownerUserId,
				FeatureLimitsEnum.Feature.CUSTOMERS,
			);

			customer = await this._customersRepository.createFromChat(
				ownerUserId,
				chat,
			);
		}

		await this._chatsService.setCustomer(
			ownerUserId,
			psid,
			String(customer._id),
		);

		return this._toChatView(
			{ ...chat, customerId: String(customer._id) as any },
			customer.name,
		);
	}

	/** Cuts the link; the customer stays, only without the Messenger contact. */
	public async unlinkCustomer(
		ownerUserId: string,
		psid: string,
	): Promise<IMessengerChatView> {
		const chat: IMessengerChat = await this._getChatOrFail(ownerUserId, psid);

		if (chat.customerId) {
			await this._customersRepository.unlinkMessengerSource(
				ownerUserId,
				String(chat.customerId),
			);
		}

		await this._chatsService.setCustomer(ownerUserId, psid, null);

		return this._toChatView({ ...chat, customerId: null }, null);
	}

	/** One file of a message, fetched from Facebook when asked for (its address expires). */
	public async getAttachment(
		ownerUserId: string,
		psid: string,
		messageRecordId: string,
		index: number,
	): Promise<{ buffer: Buffer; contentType: string }> {
		const record: IMessengerMessageRecord | null =
			await this._messagesService.findOwned(ownerUserId, psid, messageRecordId);

		const attachment = record?.attachments?.[index];

		if (!attachment) {
			throw new MessengerAttachmentNotFoundException();
		}

		return await this._graphClient.fetchAttachment(attachment.url);
	}

	//#endregion

	//#region Private Methods

	private async _handleMessage(
		message: INormalizedMessengerMessage,
	): Promise<void> {
		const connection: IMessengerConnection | null =
			await this._connectionsService.findByPageId(message.pageId);

		if (!connection) {
			return;
		}

		const ownerUserId: string = String(connection.ownerUserId);

		const user = await this._usersService.findOneById(ownerUserId);

		if (!user?.enabledApps?.includes(this.appId)) {
			return;
		}

		if (!(await this._messagesService.saveIncoming(ownerUserId, message))) {
			return;
		}

		const isFirstMessage: boolean = await this._chatsService.registerIncoming(
			ownerUserId,
			message,
		);

		if (isFirstMessage) {
			await this._learnPerson(ownerUserId, connection, message.psid);
		}

		await this._connectionsService.touchLastUpdate(connection._id, new Date());
	}

	/** The name and picture, and the customer this person already is, if any. */
	private async _learnPerson(
		ownerUserId: string,
		connection: IMessengerConnection,
		psid: string,
	): Promise<void> {
		try {
			const profile: IMetaProfile = await this._graphClient.getProfile(
				this._connectionsService.readToken(connection),
				psid,
			);

			await this._chatsService.setProfile(ownerUserId, psid, profile);
		} catch {
			// the message is kept even when Facebook gives no profile
		}

		const customer: ICustomerRef | null =
			await this._customersRepository.findByPsid(ownerUserId, psid);

		if (customer) {
			await this._chatsService.setCustomer(
				ownerUserId,
				psid,
				String(customer._id),
			);
		}
	}

	private async _getChatOrFail(
		ownerUserId: string,
		psid: string,
	): Promise<IMessengerChat> {
		const chat: IMessengerChat | null = await this._chatsService.findByPsid(
			ownerUserId,
			psid,
		);

		if (!chat) {
			throw new MessengerChatNotFoundException();
		}

		return chat;
	}

	private _isWindowOpen(chat: IMessengerChat): boolean {
		return (
			Date.now() - new Date(chat.lastIncomingAt).getTime() < REPLY_WINDOW_MS
		);
	}

	private _toChatView(
		chat: IMessengerChat,
		customerName: string | null,
	): IMessengerChatView {
		return {
			psid: chat.psid,
			name: chat.name ?? null,
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

	/**
	 * Facebook can accept the login and still give no Page: the user declined a
	 * permission, or ticked no Page on its screen. The permissions tell which.
	 * Names only are logged, never a token.
	 */
	private async _whyNoPages(
		userToken: string,
	): Promise<'missing_permission' | 'no_pages'> {
		try {
			const { granted, declined } =
				await this._graphClient.getPermissions(userToken);

			this._logger.warn(
				`Facebook login brought no Page. Granted: [${granted.join(
					', ',
				)}] Declined: [${declined.join(', ')}]`,
			);

			return LOGIN_SCOPES.every((scope: string) => granted.includes(scope))
				? 'no_pages'
				: 'missing_permission';
		} catch {
			return 'no_pages';
		}
	}

	/** A Page belongs to one user. Facebook is asked first, so nothing is kept on a refusal. */
	private async _connect(ownerUserId: string, page: IMetaPage): Promise<void> {
		const existing: IMessengerConnection | null =
			await this._connectionsService.findByPageId(page.id);

		if (existing && String(existing.ownerUserId) !== ownerUserId) {
			throw new MessengerPageAlreadyConnectedException();
		}

		try {
			await this._graphClient.subscribePage(page.id, page.accessToken);
		} catch (error) {
			if (error instanceof MetaApiError) {
				throw new MessengerPageSubscribeFailedException(error.description);
			}

			throw error;
		}

		await this._connectionsService.saveConnected(ownerUserId, page);
	}

	/** Targets are built server-side from SOCIAL_PRICES_URL: no open redirect. */
	private _redirect(
		errorCode?: string,
		query?: string,
	): { redirectTo: string } {
		const base: string = (process.env.SOCIAL_PRICES_URL ?? '').replace(
			/\/+$/,
			'',
		);
		const path: string = `${base}/apps/messenger`;

		if (errorCode) {
			return { redirectTo: `${path}?error=${errorCode}` };
		}

		return { redirectTo: query ? `${path}?${query}` : path };
	}

	//#endregion
}
