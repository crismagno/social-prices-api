import { ForbiddenException, Injectable, Logger } from '@nestjs/common';

import { FeatureLimitsService } from '../../feature-limits/feature-limits.service';
import FeatureLimitsEnum from '../../feature-limits/interfaces/feature-limits.enum';
import { UsersService } from '../../users/users.service';
import AppsEnum from '../interfaces/apps.enum';
import { IAppContext } from '../interfaces/apps.types';
import { ITelegramConnection } from './telegram-connection.interface';
import { ITelegramChat } from './telegram-chat.interface';
import { TelegramChatsService } from './telegram-chats.service';
import { TelegramConnectionsService } from './telegram-connections.service';
import { ITelegramMessageRecord } from './telegram-message.interface';
import { TelegramMessagesService } from './telegram-messages.service';
import { TelegramBotClient } from './telegram.bot-client';
import {
	ICustomerRef,
	TelegramCustomersRepository,
} from './telegram.customers.repository';
import {
	TelegramBotAlreadyConnectedException,
	TelegramChatAlreadyLinkedException,
	TelegramChatNotFoundException,
	TelegramChatUnavailableException,
	TelegramCustomerAlreadyLinkedException,
	TelegramCustomerNotFoundException,
	TelegramInvalidTokenException,
	TelegramNotConnectedException,
	TelegramWebhookRejectedException,
	TelegramWebhookUrlMissingException,
} from './telegram.exceptions';
import { parseTelegramUpdate } from './telegram.update-parser';
import {
	INormalizedTelegramMessage,
	ITelegramBotInfo,
	ITelegramChatView,
	ITelegramConnectionView,
	ITelegramUpdate,
	ITelegramWebhookInfo,
	TelegramApiError,
} from './telegram.types';
import {
	generateWebhookCredentials,
	IWebhookCredentials,
	webhookSecretMatches,
} from './telegram.webhook-credentials';

export type TelegramWebhookOutcome = 'SAVED' | 'DUPLICATE' | 'IGNORED';

export interface ITelegramWebhookStatus extends ITelegramWebhookInfo {
	/** The address this system registered. */
	expectedUrl: string;
	/** False after the public address changed (a new ngrok, say). */
	urlMatches: boolean;
	/**
	 * Telegram never clears its last delivery error, so an old one would look like
	 * a problem forever. This is true only for an error newer than the last time the
	 * webhook was registered and the last message that did arrive.
	 */
	hasActiveError: boolean;
}

const WEBHOOK_PATH: string = '/api/v1/apps/telegram/webhook';
const INVALID_TOKEN_STATUSES: number[] = [401, 404];
// Telegram says 403 when the person blocked the bot and 400 when the chat is gone.
const UNDELIVERABLE_STATUSES: number[] = [400, 403];
const DUPLICATE_KEY_CODE: number = 11000;

@Injectable()
export class TelegramService {
	private readonly _logger: Logger = new Logger(TelegramService.name);

	//#region Constructor

	constructor(
		private readonly _botClient: TelegramBotClient,
		private readonly _connectionsService: TelegramConnectionsService,
		private readonly _messagesService: TelegramMessagesService,
		private readonly _chatsService: TelegramChatsService,
		private readonly _customersRepository: TelegramCustomersRepository,
		private readonly _featureLimitsService: FeatureLimitsService,
		private readonly _usersService: UsersService,
	) {}

	//#endregion

	//#region Public Methods

	/**
	 * Checks the token with Telegram, points the bot's webhook at this system with
	 * a fresh secret, and keeps the bot. Telegram allows one webhook per bot, so a
	 * bot already used by another account is refused instead of silently taken.
	 */
	public async connect(
		ctx: IAppContext,
		botToken: string,
	): Promise<ITelegramConnectionView> {
		const baseUrl: string = this._webhookBaseUrl();

		const bot: ITelegramBotInfo = await this._getBotOrFail(botToken);

		const owner: ITelegramConnection | null =
			await this._connectionsService.findByBotId(bot.id);

		if (owner && String(owner.ownerUserId) !== ctx.ownerUserId) {
			throw new TelegramBotAlreadyConnectedException();
		}

		await this._forgetPreviousBot(ctx.ownerUserId, bot.id);

		const credentials: IWebhookCredentials = generateWebhookCredentials();

		try {
			await this._botClient.setWebhook(
				botToken,
				`${baseUrl}${WEBHOOK_PATH}/${credentials.key}`,
				credentials.secret,
			);
		} catch (error) {
			if (error instanceof TelegramApiError) {
				throw new TelegramWebhookRejectedException(error.description);
			}

			throw error;
		}

		return this._toView(
			await this._connectionsService.saveConnection({
				ownerUserId: ctx.ownerUserId,
				bot,
				botToken,
				webhookKey: credentials.key,
				webhookSecretHash: credentials.secretHash,
			}),
		);
	}

	/**
	 * Points Telegram at this system again with a fresh key and secret, using the
	 * token already kept. For when the public address changed (a new ngrok, a new
	 * domain). If Telegram refuses, the webhook that was working stays as it was.
	 */
	public async refreshWebhook(
		ownerUserId: string,
	): Promise<ITelegramWebhookStatus> {
		const connection: ITelegramConnection | null =
			await this._connectionsService.findWithToken(ownerUserId);

		if (!connection) {
			throw new TelegramNotConnectedException();
		}

		const baseUrl: string = this._webhookBaseUrl();
		const credentials: IWebhookCredentials = generateWebhookCredentials();

		try {
			await this._botClient.setWebhook(
				this._connectionsService.readToken(connection),
				`${baseUrl}${WEBHOOK_PATH}/${credentials.key}`,
				credentials.secret,
			);
		} catch (error) {
			if (error instanceof TelegramApiError) {
				throw new TelegramWebhookRejectedException(error.description);
			}

			throw error;
		}

		await this._connectionsService.updateWebhook(connection._id, {
			webhookKey: credentials.key,
			webhookSecretHash: credentials.secretHash,
		});

		return await this.getWebhookStatus(ownerUserId);
	}

	public async disconnect(ctx: IAppContext): Promise<void> {
		const connection: ITelegramConnection | null =
			await this._connectionsService.findWithToken(ctx.ownerUserId);

		if (connection) {
			await this._deleteWebhookQuietly(connection);
		}

		await this._connectionsService.deleteByOwner(ctx.ownerUserId);
	}

	public async getConnection(
		ownerUserId: string,
	): Promise<ITelegramConnectionView> {
		return this._toView(
			await this._connectionsService.findByOwner(ownerUserId),
		);
	}

	/** What Telegram says about delivering to this system; the first thing to look at when messages stop. */
	public async getWebhookStatus(
		ownerUserId: string,
	): Promise<ITelegramWebhookStatus> {
		const connection: ITelegramConnection | null =
			await this._connectionsService.findWithToken(ownerUserId);

		if (!connection) {
			throw new TelegramNotConnectedException();
		}

		const info: ITelegramWebhookInfo = await this._botClient.getWebhookInfo(
			this._connectionsService.readToken(connection),
		);

		await this._connectionsService.saveWebhookInfo(connection._id, info);

		const expectedUrl: string = `${this._webhookBaseUrl()}${WEBHOOK_PATH}/${
			connection.webhookKey
		}`;

		return {
			...info,
			expectedUrl,
			urlMatches: info.url === expectedUrl,
			hasActiveError: this._isErrorNewer(info.lastErrorDate, connection),
		};
	}

	/**
	 * Public entry for Telegram. An unknown key and a wrong secret are refused the
	 * same way, so nobody learns which keys exist. A storage failure is thrown on
	 * purpose: Telegram then delivers the same update again.
	 */
	public async handleWebhook(
		webhookKey: string,
		secretHeader: unknown,
		update: ITelegramUpdate,
	): Promise<TelegramWebhookOutcome> {
		const connection: ITelegramConnection | null =
			await this._connectionsService.findByWebhookKey(webhookKey);

		if (
			!connection ||
			!webhookSecretMatches(secretHeader, connection.webhookSecretHash)
		) {
			throw new ForbiddenException();
		}

		const ownerUserId: string = String(connection.ownerUserId);

		const message: INormalizedTelegramMessage | null =
			parseTelegramUpdate(update);

		if (!message || !(await this._isEnabledFor(ownerUserId))) {
			return 'IGNORED';
		}

		const saved: boolean = await this._messagesService.saveIncoming(
			ownerUserId,
			message,
		);

		if (!saved) {
			return 'DUPLICATE';
		}

		const isFirstMessage: boolean = await this._chatsService.registerIncoming(
			ownerUserId,
			message,
		);

		if (isFirstMessage) {
			await this._linkReturningCustomer(ownerUserId, message);
		}

		await this._connectionsService.touchLastUpdate(connection._id, new Date());

		return 'SAVED';
	}

	public async listChats(ownerUserId: string): Promise<ITelegramChatView[]> {
		const chats: ITelegramChat[] = await this._chatsService.list(ownerUserId);

		const customerIds: string[] = [
			...new Set(
				chats
					.filter((chat: ITelegramChat) => !!chat.customerId)
					.map((chat: ITelegramChat) => String(chat.customerId)),
			),
		];

		const names: Map<string, string | null> = new Map(
			(customerIds.length
				? await this._customersRepository.findNames(ownerUserId, customerIds)
				: []
			).map((customer: ICustomerRef) => [String(customer._id), customer.name]),
		);

		return chats.map((chat: ITelegramChat) =>
			this._toChatView(
				chat,
				chat.customerId ? names.get(String(chat.customerId)) ?? null : null,
			),
		);
	}

	public async getChatMessages(
		ownerUserId: string,
		chatId: number,
		options: { limit?: number; before?: string },
	): Promise<ITelegramMessageRecord[]> {
		await this._getChatOrFail(ownerUserId, chatId);

		return await this._messagesService.listByChat(ownerUserId, chatId, options);
	}

	public async markRead(ownerUserId: string, chatId: number): Promise<void> {
		await this._getChatOrFail(ownerUserId, chatId);

		await this._chatsService.markRead(ownerUserId, chatId);
	}

	/**
	 * Answers a customer through the bot. Telegram is asked first: if it refuses
	 * (the person blocked the bot, say) nothing is recorded as sent.
	 */
	public async sendMessage(
		ctx: IAppContext,
		chatId: number,
		text: string,
	): Promise<ITelegramMessageRecord> {
		const connection: ITelegramConnection | null =
			await this._connectionsService.findWithToken(ctx.ownerUserId);

		if (!connection) {
			throw new TelegramNotConnectedException();
		}

		await this._getChatOrFail(ctx.ownerUserId, chatId);

		let sent: { messageId: number; sentAt: Date };

		try {
			sent = await this._botClient.sendMessage(
				this._connectionsService.readToken(connection),
				chatId,
				text,
			);
		} catch (error) {
			if (
				error instanceof TelegramApiError &&
				UNDELIVERABLE_STATUSES.includes(error.status)
			) {
				throw new TelegramChatUnavailableException(error.description);
			}

			throw error;
		}

		const record: ITelegramMessageRecord =
			await this._messagesService.saveOutgoing(ctx.ownerUserId, {
				chatId,
				messageId: sent.messageId,
				text,
				sentAt: sent.sentAt,
				sentByEmployeeId: ctx.employeeId,
			});

		await this._chatsService.registerOutgoing(
			ctx.ownerUserId,
			chatId,
			text,
			sent.sentAt,
		);

		return record;
	}

	public async linkCustomer(
		ownerUserId: string,
		chatId: number,
		customerId: string,
	): Promise<ITelegramChatView> {
		const chat: ITelegramChat = await this._getChatOrFail(ownerUserId, chatId);

		if (chat.customerId) {
			throw new TelegramChatAlreadyLinkedException();
		}

		const customer: ICustomerRef | null =
			await this._customersRepository.findOwned(ownerUserId, customerId);

		if (!customer) {
			throw new TelegramCustomerNotFoundException();
		}

		let linked: boolean;

		try {
			linked = await this._customersRepository.linkTelegramSource(
				ownerUserId,
				customerId,
				chat.telegramUserId,
			);
		} catch (error) {
			if ((error as { code?: number })?.code === DUPLICATE_KEY_CODE) {
				throw new TelegramCustomerAlreadyLinkedException();
			}

			throw error;
		}

		if (!linked) {
			throw new TelegramCustomerAlreadyLinkedException();
		}

		await this._chatsService.setCustomer(ownerUserId, chatId, customerId);

		return this._toChatView(
			{ ...chat, customerId: customerId as any },
			customer.name,
		);
	}

	/**
	 * Makes a customer out of the person. If that Telegram person already is a
	 * customer (after an unlink, or from before) that one is used, so there is never
	 * a second customer for the same person and no plan limit is spent.
	 */
	public async createCustomerFromChat(
		ownerUserId: string,
		chatId: number,
	): Promise<ITelegramChatView> {
		const chat: ITelegramChat = await this._getChatOrFail(ownerUserId, chatId);

		if (chat.customerId) {
			throw new TelegramChatAlreadyLinkedException();
		}

		let customer: ICustomerRef | null =
			await this._customersRepository.findByTelegramUserId(
				ownerUserId,
				chat.telegramUserId,
			);

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
			chatId,
			String(customer._id),
		);

		return this._toChatView(
			{ ...chat, customerId: String(customer._id) as any },
			customer.name,
		);
	}

	/** Cuts the link; the customer stays, only without the Telegram contact. */
	public async unlinkCustomer(
		ownerUserId: string,
		chatId: number,
	): Promise<ITelegramChatView> {
		const chat: ITelegramChat = await this._getChatOrFail(ownerUserId, chatId);

		if (chat.customerId) {
			await this._customersRepository.unlinkTelegramSource(
				ownerUserId,
				String(chat.customerId),
			);

			await this._chatsService.setCustomer(ownerUserId, chatId, null);
		}

		return this._toChatView({ ...chat, customerId: null }, null);
	}

	//#endregion

	//#region Private Methods

	private async _getBotOrFail(botToken: string): Promise<ITelegramBotInfo> {
		try {
			return await this._botClient.getMe(botToken);
		} catch (error) {
			if (
				error instanceof TelegramApiError &&
				INVALID_TOKEN_STATUSES.includes(error.status)
			) {
				throw new TelegramInvalidTokenException();
			}

			throw error;
		}
	}

	/** Switching to another bot leaves the old one pointing here; stop that. */
	private async _forgetPreviousBot(
		ownerUserId: string,
		newBotId: number,
	): Promise<void> {
		const previous: ITelegramConnection | null =
			await this._connectionsService.findWithToken(ownerUserId);

		if (previous && previous.botId !== newBotId) {
			await this._deleteWebhookQuietly(previous);
		}
	}

	private async _deleteWebhookQuietly(
		connection: ITelegramConnection,
	): Promise<void> {
		try {
			await this._botClient.deleteWebhook(
				this._connectionsService.readToken(connection),
			);
		} catch (error) {
			// An old or revoked bot must not stop the user from moving on.
			this._logger.warn(
				`Could not remove the webhook of bot ${connection.botUsername}: ${(
					error as Error
				)?.message}`,
			);
		}
	}

	private async _isEnabledFor(ownerUserId: string): Promise<boolean> {
		const user = await this._usersService.findOneById(ownerUserId);

		return !!user?.enabledApps?.includes(AppsEnum.App.TELEGRAM);
	}

	private _webhookBaseUrl(): string {
		const base: string = (process.env.TELEGRAM_WEBHOOK_BASE_URL ?? '')
			.trim()
			.replace(/\/+$/, '');

		if (!/^https:\/\/[^/\s]+/.test(base)) {
			throw new TelegramWebhookUrlMissingException();
		}

		return base;
	}

	/** An error counts only if it came after both the webhook was (re)registered and the last message received. */
	private _isErrorNewer(
		errorDate: Date | null,
		connection: ITelegramConnection,
	): boolean {
		if (!errorDate) {
			return false;
		}

		const registeredAt: Date =
			connection.webhookRegisteredAt ?? connection.connectedAt;

		const baseline: number = Math.max(
			registeredAt ? new Date(registeredAt).getTime() : 0,
			connection.lastUpdateAt ? new Date(connection.lastUpdateAt).getTime() : 0,
		);

		return new Date(errorDate).getTime() > baseline;
	}

	private async _getChatOrFail(
		ownerUserId: string,
		chatId: number,
	): Promise<ITelegramChat> {
		const chat: ITelegramChat | null = await this._chatsService.findByChatId(
			ownerUserId,
			chatId,
		);

		if (!chat) {
			throw new TelegramChatNotFoundException();
		}

		return chat;
	}

	/** A person who wrote before and was linked to a customer is recognised on their first message here. */
	private async _linkReturningCustomer(
		ownerUserId: string,
		message: INormalizedTelegramMessage,
	): Promise<void> {
		const customer: ICustomerRef | null =
			await this._customersRepository.findByTelegramUserId(
				ownerUserId,
				message.fromUserId,
			);

		if (customer) {
			await this._chatsService.setCustomer(
				ownerUserId,
				message.chatId,
				String(customer._id),
			);
		}
	}

	private _toChatView(
		chat: ITelegramChat,
		customerName: string | null,
	): ITelegramChatView {
		return {
			chatId: chat.chatId,
			telegramUserId: chat.telegramUserId,
			firstName: chat.firstName ?? null,
			lastName: chat.lastName ?? null,
			username: chat.username ?? null,
			customerId: chat.customerId ? String(chat.customerId) : null,
			customerName,
			lastMessageAt: chat.lastMessageAt,
			lastMessageText: chat.lastMessageText ?? null,
			lastMessageDirection: chat.lastMessageDirection,
			lastContentType: chat.lastContentType,
			unreadCount: chat.unreadCount ?? 0,
		};
	}

	private _toView(
		connection: ITelegramConnection | null,
	): ITelegramConnectionView {
		return {
			connected: connection?.status === AppsEnum.ConnectionStatus.CONNECTED,
			botUsername: connection?.botUsername ?? null,
			botName: connection?.botName ?? null,
			connectedAt: connection?.connectedAt ?? null,
			lastUpdateAt: connection?.lastUpdateAt ?? null,
		};
	}

	//#endregion
}
