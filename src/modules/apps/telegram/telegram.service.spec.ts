import { ForbiddenException } from '@nestjs/common';

import AppsEnum from '../interfaces/apps.enum';
import { FeatureLimitReachedException } from '../../feature-limits/feature-limit-reached.exception';
import FeatureLimitsEnum from '../../feature-limits/interfaces/feature-limits.enum';
import {
	TelegramBotAlreadyConnectedException,
	TelegramChatAlreadyLinkedException,
	TelegramChatNotFoundException,
	TelegramMediaNotFoundException,
	TelegramMessageNotDeletableException,
	TelegramMessageNotFoundException,
	TelegramChatUnavailableException,
	TelegramCustomerAlreadyLinkedException,
	TelegramCustomerNotFoundException,
	TelegramInvalidTokenException,
	TelegramNotConnectedException,
	TelegramWebhookRejectedException,
	TelegramWebhookUrlMissingException,
} from './telegram.exceptions';
import { TelegramService } from './telegram.service';
import { TelegramApiError } from './telegram.types';
import {
	generateWebhookCredentials,
	hashWebhookSecret,
} from './telegram.webhook-credentials';

const CTX = { ownerUserId: 'u1', employeeId: null };
const TOKEN = '123456789:AAHtoken_value_for_tests_only_0000000';
const BASE = 'https://abc.ngrok-free.app';

const textUpdate = (updateId = 100, over: any = {}): any => ({
	update_id: updateId,
	message: {
		message_id: 7,
		date: 1_760_000_000,
		chat: { id: 555, type: 'private' },
		from: { id: 555, first_name: 'Ana' },
		text: 'oi',
		...over,
	},
});

const build = (
	opts: { enabledApps?: any; connection?: any; chat?: any } = {},
) => {
	process.env.TELEGRAM_WEBHOOK_BASE_URL = BASE;

	const bot: any = {
		getMe: jest.fn().mockResolvedValue({
			id: 123456789,
			username: 'loja_bot',
			firstName: 'Loja',
		}),
		setWebhook: jest.fn().mockResolvedValue(undefined),
		deleteWebhook: jest.fn().mockResolvedValue(undefined),
		getWebhookInfo: jest.fn().mockResolvedValue({
			url: `${BASE}/api/v1/apps/telegram/webhook/KEY`,
			pendingUpdateCount: 0,
			lastErrorMessage: null,
			lastErrorDate: null,
		}),
	};
	const connections: any = {
		findByBotId: jest.fn().mockResolvedValue(null),
		findByOwner: jest.fn().mockResolvedValue(opts.connection ?? null),
		findWithToken: jest.fn().mockResolvedValue(opts.connection ?? null),
		findByWebhookKey: jest.fn().mockResolvedValue(opts.connection ?? null),
		readToken: jest.fn().mockReturnValue(TOKEN),
		saveConnection: jest.fn().mockResolvedValue({
			_id: 'c1',
			status: AppsEnum.ConnectionStatus.CONNECTED,
			botUsername: 'loja_bot',
			botName: 'Loja',
			connectedAt: new Date('2030-01-01'),
			lastUpdateAt: null,
		}),
		touchLastUpdate: jest.fn().mockResolvedValue(undefined),
		updateWebhook: jest.fn().mockResolvedValue(undefined),
		saveWebhookInfo: jest.fn().mockResolvedValue(undefined),
		deleteByOwner: jest.fn().mockResolvedValue(undefined),
	};
	const messages: any = {
		saveIncoming: jest.fn().mockResolvedValue(true),
		saveOutgoing: jest.fn().mockResolvedValue({ _id: 'out1', text: 'claro!' }),
		listByChat: jest.fn().mockResolvedValue([{ _id: 'm1' }]),
		findWithMedia: jest.fn().mockResolvedValue(null),
		findOwned: jest.fn().mockResolvedValue(null),
		deleteOwned: jest.fn().mockResolvedValue(undefined),
		findLatest: jest.fn().mockResolvedValue(null),
	};
	const chats: any = {
		registerIncoming: jest.fn().mockResolvedValue(false),
		registerOutgoing: jest.fn().mockResolvedValue(undefined),
		markRead: jest.fn().mockResolvedValue(undefined),
		setLastMessage: jest.fn().mockResolvedValue(undefined),
		setCustomer: jest.fn().mockResolvedValue(undefined),
		list: jest.fn().mockResolvedValue([]),
		findByChatId: jest.fn().mockResolvedValue(opts.chat ?? null),
	};
	const realtime: any = { notifyInboxUpdated: jest.fn() };
	const customers: any = {
		findByTelegramUserId: jest.fn().mockResolvedValue(null),
		findNames: jest.fn().mockResolvedValue([]),
		findOwned: jest.fn().mockResolvedValue({ _id: 'cu1', name: 'Ana Cliente' }),
		createFromChat: jest
			.fn()
			.mockResolvedValue({ _id: 'cu9', name: 'Ana Souza' }),
		linkTelegramSource: jest.fn().mockResolvedValue(true),
		unlinkTelegramSource: jest.fn().mockResolvedValue(undefined),
	};
	const featureLimits: any = {
		assertCanCreate: jest.fn().mockResolvedValue(undefined),
	};
	const users: any = {
		findOneById: jest.fn().mockResolvedValue({
			enabledApps: opts.enabledApps ?? [AppsEnum.App.TELEGRAM],
		}),
	};

	return {
		realtime,
		bot,
		connections,
		messages,
		chats,
		customers,
		featureLimits,
		users,
		service: new TelegramService(
			bot,
			connections,
			messages,
			chats,
			customers,
			featureLimits,
			users,
			realtime,
		),
	};
};

const connectionWithSecret = () => {
	const creds = generateWebhookCredentials();

	return {
		creds,
		connection: {
			_id: 'c1',
			ownerUserId: 'u1',
			botId: 123456789,
			botUsername: 'loja_bot',
			botName: 'Loja',
			webhookKey: creds.key,
			webhookSecretHash: creds.secretHash,
			token: 'ENC',
		},
	};
};

describe('TelegramService', () => {
	describe('connect', () => {
		it('checks the token, registers the webhook with a fresh secret and saves the bot', async () => {
			const { service, bot, connections } = build();

			const view = await service.connect(CTX, TOKEN);

			expect(bot.getMe).toHaveBeenCalledWith(TOKEN);

			const [token, url, secret] = bot.setWebhook.mock.calls[0];
			expect(token).toBe(TOKEN);
			expect(url).toMatch(
				new RegExp(`^${BASE}/api/v1/apps/telegram/webhook/[A-Za-z0-9_-]+$`),
			);

			const saved = connections.saveConnection.mock.calls[0][0];
			expect(saved).toMatchObject({
				ownerUserId: 'u1',
				bot: { id: 123456789, username: 'loja_bot', firstName: 'Loja' },
				botToken: TOKEN,
			});
			// the key in the URL is the one saved, and only the secret's hash is saved
			expect(url.endsWith(`/${saved.webhookKey}`)).toBe(true);
			expect(saved.webhookSecretHash).toBe(hashWebhookSecret(secret));
			expect(JSON.stringify(saved)).not.toContain(secret);

			expect(view).toEqual({
				connected: true,
				botUsername: 'loja_bot',
				botName: 'Loja',
				connectedAt: new Date('2030-01-01'),
				lastUpdateAt: null,
			});
			expect(JSON.stringify(view)).not.toContain(TOKEN);
		});

		it('refuses a token Telegram does not know, saving nothing', async () => {
			const { service, bot, connections } = build();
			bot.getMe.mockRejectedValue(new TelegramApiError(401, 'Unauthorized'));

			await expect(service.connect(CTX, TOKEN)).rejects.toBeInstanceOf(
				TelegramInvalidTokenException,
			);
			expect(bot.setWebhook).not.toHaveBeenCalled();
			expect(connections.saveConnection).not.toHaveBeenCalled();
		});

		it('lets other Telegram failures through instead of calling them a bad token', async () => {
			const { service, bot } = build();
			bot.getMe.mockRejectedValue(
				new TelegramApiError(0, 'Could not reach Telegram.'),
			);

			await expect(service.connect(CTX, TOKEN)).rejects.toBeInstanceOf(
				TelegramApiError,
			);
		});

		it('refuses a bot that already belongs to another user', async () => {
			const { service, bot, connections } = build();
			connections.findByBotId.mockResolvedValue({
				ownerUserId: 'someone-else',
			});

			await expect(service.connect(CTX, TOKEN)).rejects.toBeInstanceOf(
				TelegramBotAlreadyConnectedException,
			);
			expect(bot.setWebhook).not.toHaveBeenCalled();
		});

		it('lets the same user connect the same bot again', async () => {
			const { service, connections } = build();
			connections.findByBotId.mockResolvedValue({ ownerUserId: 'u1' });

			await expect(service.connect(CTX, TOKEN)).resolves.toMatchObject({
				connected: true,
			});
		});

		it.each([
			undefined,
			'',
			'http://abc.ngrok-free.app',
			'abc.ngrok-free.app',
			'ftp://x.example',
		])(
			'refuses to connect without an https webhook base url (%p)',
			async (base) => {
				const { service, bot } = build();
				if (base === undefined) delete process.env.TELEGRAM_WEBHOOK_BASE_URL;
				else process.env.TELEGRAM_WEBHOOK_BASE_URL = base;

				await expect(service.connect(CTX, TOKEN)).rejects.toBeInstanceOf(
					TelegramWebhookUrlMissingException,
				);
				expect(bot.getMe).not.toHaveBeenCalled();
			},
		);

		it('accepts a base url with a trailing slash without doubling it', async () => {
			const { service, bot } = build();
			process.env.TELEGRAM_WEBHOOK_BASE_URL = `${BASE}/`;

			await service.connect(CTX, TOKEN);

			expect(bot.setWebhook.mock.calls[0][1]).toContain(
				`${BASE}/api/v1/apps/telegram/webhook/`,
			);
			expect(bot.setWebhook.mock.calls[0][1]).not.toContain('//api');
		});

		it('reports why Telegram refused the webhook and saves nothing', async () => {
			const { service, bot, connections } = build();
			bot.setWebhook.mockRejectedValue(
				new TelegramApiError(
					400,
					'Bad Request: bad webhook: HTTPS url must be provided',
				),
			);

			const error = await service.connect(CTX, TOKEN).catch((e) => e);

			expect(error).toBeInstanceOf(TelegramWebhookRejectedException);
			expect(JSON.stringify(error.getResponse())).toContain(
				'HTTPS url must be provided',
			);
			expect(connections.saveConnection).not.toHaveBeenCalled();
		});

		it('drops the webhook of the previous bot when the user switches bots', async () => {
			const { service, bot, connections } = build();
			connections.findWithToken.mockResolvedValue({ botId: 999, token: 'OLD' });
			connections.readToken.mockReturnValue('999:OLDTOKEN');

			await service.connect(CTX, TOKEN);

			expect(bot.deleteWebhook).toHaveBeenCalledWith('999:OLDTOKEN');
		});

		it('does not fail the connection if the old bot cannot be cleaned up', async () => {
			const { service, bot, connections } = build();
			connections.findWithToken.mockResolvedValue({ botId: 999, token: 'OLD' });
			bot.deleteWebhook.mockRejectedValue(
				new TelegramApiError(401, 'Unauthorized'),
			);

			await expect(service.connect(CTX, TOKEN)).resolves.toMatchObject({
				connected: true,
			});
		});
	});

	describe('disconnect', () => {
		it('removes the webhook at Telegram, then the connection', async () => {
			const { service, bot, connections } = build({
				connection: { token: 'ENC' },
			});

			await service.disconnect(CTX);

			expect(bot.deleteWebhook).toHaveBeenCalledWith(TOKEN);
			expect(connections.deleteByOwner).toHaveBeenCalledWith('u1');
		});

		it('still deletes locally when Telegram cannot be reached', async () => {
			const { service, bot, connections } = build({
				connection: { token: 'ENC' },
			});
			bot.deleteWebhook.mockRejectedValue(
				new TelegramApiError(0, 'Could not reach Telegram.'),
			);

			await service.disconnect(CTX);

			expect(connections.deleteByOwner).toHaveBeenCalledWith('u1');
		});

		it('is harmless for a user that never connected', async () => {
			const { service, bot, connections } = build();

			await service.disconnect(CTX);

			expect(bot.deleteWebhook).not.toHaveBeenCalled();
			expect(connections.deleteByOwner).toHaveBeenCalledWith('u1');
		});
	});

	describe('getConnection', () => {
		it('describes the bot without any secret', async () => {
			const { service } = build({
				connection: {
					status: AppsEnum.ConnectionStatus.CONNECTED,
					botUsername: 'loja_bot',
					botName: 'Loja',
					connectedAt: new Date('2030-01-01'),
					lastUpdateAt: new Date('2030-01-02'),
					token: 'ENC',
					webhookSecretHash: 'hash',
				},
			});

			const view = await service.getConnection('u1');

			expect(view).toEqual({
				connected: true,
				botUsername: 'loja_bot',
				botName: 'Loja',
				connectedAt: new Date('2030-01-01'),
				lastUpdateAt: new Date('2030-01-02'),
			});
		});

		it('says not connected when there is no bot', async () => {
			const { service } = build();

			await expect(service.getConnection('u1')).resolves.toEqual({
				connected: false,
				botUsername: null,
				botName: null,
				connectedAt: null,
				lastUpdateAt: null,
			});
		});
	});

	describe('refreshWebhook', () => {
		it('registers the webhook again with a fresh key and secret, using the stored token', async () => {
			const { service, bot, connections } = build({
				connection: { ...connectionWithSecret().connection, _id: 'c1' },
			});

			await service.refreshWebhook('u1');

			const [token, url, secret] = bot.setWebhook.mock.calls[0];
			expect(token).toBe(TOKEN);

			const update = connections.updateWebhook.mock.calls[0];
			expect(update[0]).toBe('c1');
			expect(url.endsWith(`/${update[1].webhookKey}`)).toBe(true);
			expect(update[1].webhookSecretHash).toBe(hashWebhookSecret(secret));
			expect(JSON.stringify(update)).not.toContain(secret);
		});

		it('keeps the old webhook working if Telegram refuses the new one', async () => {
			const { service, bot, connections } = build({
				connection: connectionWithSecret().connection,
			});
			bot.setWebhook.mockRejectedValue(
				new TelegramApiError(400, 'Bad Request: bad webhook'),
			);

			await expect(service.refreshWebhook('u1')).rejects.toBeInstanceOf(
				TelegramWebhookRejectedException,
			);
			expect(connections.updateWebhook).not.toHaveBeenCalled();
		});

		it('refuses without a public https base url', async () => {
			const { service, bot } = build({
				connection: connectionWithSecret().connection,
			});
			delete process.env.TELEGRAM_WEBHOOK_BASE_URL;

			await expect(service.refreshWebhook('u1')).rejects.toBeInstanceOf(
				TelegramWebhookUrlMissingException,
			);
			expect(bot.setWebhook).not.toHaveBeenCalled();
		});

		it('refuses when no bot is connected', async () => {
			await expect(build().service.refreshWebhook('u1')).rejects.toBeInstanceOf(
				TelegramNotConnectedException,
			);
		});
	});

	describe('getWebhookStatus', () => {
		it('shows what Telegram has pending and whether its url is still the right one', async () => {
			const { service, bot, connections } = build({
				connection: { ...connectionWithSecret().connection, webhookKey: 'KEY' },
			});

			const status = await service.getWebhookStatus('u1');

			expect(bot.getWebhookInfo).toHaveBeenCalledWith(TOKEN);
			expect(connections.saveWebhookInfo).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ pendingUpdateCount: 0 }),
			);
			expect(status).toMatchObject({
				pendingUpdateCount: 0,
				lastErrorMessage: null,
				urlMatches: true,
			});
		});

		describe('hasActiveError: Telegram keeps its last error forever, so only a newer one counts', () => {
			const T = (iso: string) => new Date(iso);

			const statusWith = async (opts: {
				connection?: any;
				lastErrorDate: Date | null;
				lastErrorMessage?: string | null;
			}) => {
				const { service, bot } = build({
					connection: {
						...connectionWithSecret().connection,
						webhookKey: 'KEY',
						connectedAt: T('2030-01-01T10:00:00Z'),
						webhookRegisteredAt: T('2030-01-01T12:00:00Z'),
						lastUpdateAt: null,
						...opts.connection,
					},
				});
				bot.getWebhookInfo.mockResolvedValue({
					url: `${BASE}/api/v1/apps/telegram/webhook/KEY`,
					pendingUpdateCount: 0,
					lastErrorMessage:
						opts.lastErrorMessage ??
						(opts.lastErrorDate ? 'Wrong response: 404' : null),
					lastErrorDate: opts.lastErrorDate,
				});

				return await service.getWebhookStatus('u1');
			};

			it('no error at all is no active error', async () => {
				expect((await statusWith({ lastErrorDate: null })).hasActiveError).toBe(
					false,
				);
			});

			it('an error from before the webhook was registered again is history', async () => {
				const status = await statusWith({
					lastErrorDate: T('2030-01-01T11:00:00Z'),
				});

				expect(status.hasActiveError).toBe(false);
				expect(status.lastErrorMessage).toBe('Wrong response: 404');
			});

			it('an error after the registration is active', async () => {
				expect(
					(await statusWith({ lastErrorDate: T('2030-01-01T12:30:00Z') }))
						.hasActiveError,
				).toBe(true);
			});

			it('an error followed by a message that did arrive is resolved', async () => {
				expect(
					(
						await statusWith({
							lastErrorDate: T('2030-01-01T12:30:00Z'),
							connection: { lastUpdateAt: T('2030-01-01T13:00:00Z') },
						})
					).hasActiveError,
				).toBe(false);
			});

			it('an error newer than the last message is active', async () => {
				expect(
					(
						await statusWith({
							lastErrorDate: T('2030-01-01T14:00:00Z'),
							connection: { lastUpdateAt: T('2030-01-01T13:00:00Z') },
						})
					).hasActiveError,
				).toBe(true);
			});

			it('falls back to the connect time for connections made before webhookRegisteredAt existed', async () => {
				expect(
					(
						await statusWith({
							lastErrorDate: T('2030-01-01T09:00:00Z'),
							connection: { webhookRegisteredAt: undefined },
						})
					).hasActiveError,
				).toBe(false);
				expect(
					(
						await statusWith({
							lastErrorDate: T('2030-01-01T11:00:00Z'),
							connection: { webhookRegisteredAt: undefined },
						})
					).hasActiveError,
				).toBe(true);
			});
		});

		it('flags a stale url, as after the ngrok address changed', async () => {
			const { service, bot } = build({
				connection: { ...connectionWithSecret().connection, webhookKey: 'KEY' },
			});
			bot.getWebhookInfo.mockResolvedValue({
				url: 'https://old.ngrok-free.app/api/v1/apps/telegram/webhook/KEY',
				pendingUpdateCount: 4,
				lastErrorMessage: 'Connection refused',
				lastErrorDate: null,
			});

			expect(await service.getWebhookStatus('u1')).toMatchObject({
				urlMatches: false,
				pendingUpdateCount: 4,
				lastErrorMessage: 'Connection refused',
			});
		});

		it('refuses when no bot is connected', async () => {
			await expect(
				build().service.getWebhookStatus('u1'),
			).rejects.toBeInstanceOf(TelegramNotConnectedException);
		});
	});

	describe('handleWebhook', () => {
		it('stores a message that arrives with the right key and secret', async () => {
			const { creds, connection } = connectionWithSecret();
			const { service, messages, connections } = build({ connection });

			await expect(
				service.handleWebhook(creds.key, creds.secret, textUpdate()),
			).resolves.toBe('SAVED');

			expect(messages.saveIncoming).toHaveBeenCalledWith(
				'u1',
				expect.objectContaining({ updateId: 100, chatId: 555, text: 'oi' }),
			);
			expect(connections.touchLastUpdate).toHaveBeenCalledWith(
				'c1',
				expect.any(Date),
			);
		});

		it('refuses a wrong, missing or malformed secret, storing nothing', async () => {
			const { creds, connection } = connectionWithSecret();
			const { service, messages } = build({ connection });

			for (const secret of [
				'wrong',
				'',
				undefined,
				`${creds.secret}x`,
				['a'] as any,
			]) {
				await expect(
					service.handleWebhook(creds.key, secret as any, textUpdate()),
				).rejects.toBeInstanceOf(ForbiddenException);
			}

			expect(messages.saveIncoming).not.toHaveBeenCalled();
		});

		it('refuses an unknown key the same way, so nothing is revealed', async () => {
			const { service, messages } = build();

			await expect(
				service.handleWebhook('nope', 'any', textUpdate()),
			).rejects.toBeInstanceOf(ForbiddenException);
			expect(messages.saveIncoming).not.toHaveBeenCalled();
		});

		it('answers a repeated delivery as a duplicate, not as an error', async () => {
			const { creds, connection } = connectionWithSecret();
			const { service, messages, connections } = build({ connection });
			messages.saveIncoming.mockResolvedValue(false);

			await expect(
				service.handleWebhook(creds.key, creds.secret, textUpdate()),
			).resolves.toBe('DUPLICATE');
			expect(connections.touchLastUpdate).not.toHaveBeenCalled();
		});

		it('ignores updates that are not direct messages', async () => {
			const { creds, connection } = connectionWithSecret();
			const { service, messages } = build({ connection });

			await expect(
				service.handleWebhook(creds.key, creds.secret, {
					update_id: 9,
					edited_message: {},
				} as any),
			).resolves.toBe('IGNORED');
			expect(messages.saveIncoming).not.toHaveBeenCalled();
		});

		it('stores nothing, but still answers, when the manager disabled the app', async () => {
			const { creds, connection } = connectionWithSecret();
			const { service, messages } = build({ connection, enabledApps: [] });

			await expect(
				service.handleWebhook(creds.key, creds.secret, textUpdate()),
			).resolves.toBe('IGNORED');
			expect(messages.saveIncoming).not.toHaveBeenCalled();
		});

		it('lets a storage failure through so Telegram delivers the message again', async () => {
			const { creds, connection } = connectionWithSecret();
			const { service, messages } = build({ connection });
			messages.saveIncoming.mockRejectedValue(new Error('db down'));

			await expect(
				service.handleWebhook(creds.key, creds.secret, textUpdate()),
			).rejects.toThrow('db down');
		});
	});

	describe('handleWebhook, the inbox side', () => {
		it('keeps the inbox up to date when a message is saved', async () => {
			const { creds, connection } = connectionWithSecret();
			const { service, chats } = build({ connection });

			await service.handleWebhook(creds.key, creds.secret, textUpdate());

			expect(chats.registerIncoming).toHaveBeenCalledWith(
				'u1',
				expect.objectContaining({ chatId: 555, fromUserId: 555, text: 'oi' }),
			);
		});

		it('leaves the inbox alone for a repeated delivery', async () => {
			const { creds, connection } = connectionWithSecret();
			const { service, messages, chats } = build({ connection });
			messages.saveIncoming.mockResolvedValue(false);

			await service.handleWebhook(creds.key, creds.secret, textUpdate());

			expect(chats.registerIncoming).not.toHaveBeenCalled();
		});

		it('recognises a returning customer on the first message: links the chat to who they already are', async () => {
			const { creds, connection } = connectionWithSecret();
			const { service, chats, customers } = build({ connection });
			chats.registerIncoming.mockResolvedValue(true);
			customers.findByTelegramUserId.mockResolvedValue({
				_id: 'cu1',
				name: 'Ana',
			});

			await service.handleWebhook(creds.key, creds.secret, textUpdate());

			expect(customers.findByTelegramUserId).toHaveBeenCalledWith('u1', 555);
			expect(chats.setCustomer).toHaveBeenCalledWith('u1', 555, 'cu1');
		});

		it('does not look for a customer when the person already had a conversation', async () => {
			const { creds, connection } = connectionWithSecret();
			const { service, customers } = build({ connection });

			await service.handleWebhook(creds.key, creds.secret, textUpdate());

			expect(customers.findByTelegramUserId).not.toHaveBeenCalled();
		});
	});

	describe('sendMedia', () => {
		const chat = { chatId: 555, telegramUserId: 555 };
		const file = {
			buffer: Buffer.alloc(4),
			fileName: 'a.pdf',
			mimeType: 'application/pdf',
		};
		const media = { fileId: 'FID', fileName: 'a.pdf' };

		it('uploads through the bot, keeps the file reference and previews it in the inbox', async () => {
			const { service, bot, messages, chats } = build({
				connection: { token: 'ENC' },
				chat,
			});
			bot.sendMedia = jest.fn().mockResolvedValue({
				messageId: 43,
				sentAt: new Date('2030-01-02'),
				contentType: 'DOCUMENT',
				media,
			});

			await service.sendMedia(CTX, 555, file, 'segue');

			expect(bot.sendMedia).toHaveBeenCalledWith(TOKEN, 555, file, 'segue');
			expect(messages.saveOutgoing).toHaveBeenCalledWith('u1', {
				chatId: 555,
				messageId: 43,
				text: 'segue',
				contentType: 'DOCUMENT',
				media,
				sentAt: new Date('2030-01-02'),
				sentByEmployeeId: CTX.employeeId,
			});
			expect(chats.registerOutgoing).toHaveBeenCalledWith(
				'u1',
				555,
				'segue',
				new Date('2030-01-02'),
				'DOCUMENT',
			);
		});

		it('passes along that a recording goes as a voice message', async () => {
			const { service, bot } = build({ connection: { token: 'ENC' }, chat });
			bot.sendMedia = jest.fn().mockResolvedValue({
				messageId: 44,
				sentAt: new Date('2030-01-02'),
				contentType: 'VOICE',
				media,
			});

			await service.sendMedia(CTX, 555, file, null, true);

			expect(bot.sendMedia).toHaveBeenCalledWith(TOKEN, 555, file, null, true);
		});

		it("refuses a conversation that is not this user's, uploading nothing", async () => {
			const { service, bot } = build({ connection: { token: 'ENC' } });
			bot.sendMedia = jest.fn();

			await expect(
				service.sendMedia(CTX, 999, file, null),
			).rejects.toBeInstanceOf(TelegramChatNotFoundException);
			expect(bot.sendMedia).not.toHaveBeenCalled();
		});

		it('explains when Telegram refuses the file, keeping nothing', async () => {
			const { service, bot, messages } = build({
				connection: { token: 'ENC' },
				chat,
			});
			bot.sendMedia = jest
				.fn()
				.mockRejectedValue(
					new TelegramApiError(400, 'Bad Request: wrong file'),
				);

			await expect(
				service.sendMedia(CTX, 555, file, null),
			).rejects.toBeInstanceOf(TelegramChatUnavailableException);
			expect(messages.saveOutgoing).not.toHaveBeenCalled();
		});
	});

	describe('deleteMessage', () => {
		const record = { _id: 'm1', chatId: 555, messageId: 42 };

		const setup = (botBehaviour?: jest.Mock) => {
			const built = build({
				connection: { token: 'ENC' },
				chat: { chatId: 555 },
			});
			built.messages.findOwned.mockResolvedValue(record);
			built.bot.deleteMessage =
				botBehaviour ?? jest.fn().mockResolvedValue(undefined);

			return built;
		};

		it('removes it at Telegram, then here, and fixes the inbox preview', async () => {
			const { service, bot, messages, chats } = setup();
			const newest = { _id: 'm0', text: 'oi' };
			messages.findLatest.mockResolvedValue(newest);

			await service.deleteMessage('u1', 555, 'm1');

			expect(bot.deleteMessage).toHaveBeenCalledWith(TOKEN, 555, 42);
			expect(messages.deleteOwned).toHaveBeenCalledWith('u1', 555, 'm1');
			expect(chats.setLastMessage).toHaveBeenCalledWith('u1', 555, newest);
		});

		it('leaves the preview alone when the conversation has no message left', async () => {
			const { service, chats } = setup();

			await service.deleteMessage('u1', 555, 'm1');

			expect(chats.setLastMessage).not.toHaveBeenCalled();
		});

		it('still removes it here when Telegram says it is already gone', async () => {
			const { service, messages } = setup(
				jest
					.fn()
					.mockRejectedValue(
						new TelegramApiError(
							400,
							'Bad Request: message to delete not found',
						),
					),
			);

			await service.deleteMessage('u1', 555, 'm1');

			expect(messages.deleteOwned).toHaveBeenCalled();
		});

		it.each([400, 403])(
			'keeps it, and says why, when Telegram refuses (status %p)',
			async (status) => {
				const { service, messages } = setup(
					jest
						.fn()
						.mockRejectedValue(
							new TelegramApiError(
								status,
								"Bad Request: message can't be deleted",
							),
						),
				);

				const error = await service
					.deleteMessage('u1', 555, 'm1')
					.catch((e) => e);

				expect(error).toBeInstanceOf(TelegramMessageNotDeletableException);
				expect(JSON.stringify(error.getResponse())).toContain(
					"can't be deleted",
				);
				expect(messages.deleteOwned).not.toHaveBeenCalled();
			},
		);

		it('lets other failures through and keeps the message', async () => {
			const { service, messages } = setup(
				jest
					.fn()
					.mockRejectedValue(
						new TelegramApiError(0, 'Could not reach Telegram.'),
					),
			);

			await expect(
				service.deleteMessage('u1', 555, 'm1'),
			).rejects.toBeInstanceOf(TelegramApiError);
			expect(messages.deleteOwned).not.toHaveBeenCalled();
		});

		it("does not know a message that is not this user's", async () => {
			const { service, bot, messages } = setup();
			messages.findOwned.mockResolvedValue(null);

			await expect(
				service.deleteMessage('u1', 555, 'm1'),
			).rejects.toBeInstanceOf(TelegramMessageNotFoundException);
			expect(bot.deleteMessage).not.toHaveBeenCalled();
		});

		it('refuses when no bot is connected', async () => {
			await expect(
				build().service.deleteMessage('u1', 555, 'm1'),
			).rejects.toBeInstanceOf(TelegramNotConnectedException);
		});
	});

	describe('getMedia', () => {
		it("downloads the file of one of this user's messages", async () => {
			const { service, bot, messages } = build({
				connection: { token: 'ENC' },
			});
			messages.findWithMedia.mockResolvedValue({
				media: {
					fileId: 'FID',
					fileName: 'a.pdf',
					mimeType: 'application/pdf',
				},
			});
			bot.downloadFile = jest.fn().mockResolvedValue({
				buffer: Buffer.from('x'),
				filePath: 'docs/a.pdf',
			});

			const result = await service.getMedia('u1', 555, 'm1');

			expect(messages.findWithMedia).toHaveBeenCalledWith('u1', 555, 'm1');
			expect(bot.downloadFile).toHaveBeenCalledWith(TOKEN, 'FID');
			expect(result).toEqual({
				buffer: Buffer.from('x'),
				mimeType: 'application/pdf',
				fileName: 'a.pdf',
			});
		});

		it('falls back to the type and name Telegram gave for the path', async () => {
			const { service, bot, messages } = build({
				connection: { token: 'ENC' },
			});
			messages.findWithMedia.mockResolvedValue({
				media: { fileId: 'FID', fileName: null, mimeType: null },
			});
			bot.downloadFile = jest.fn().mockResolvedValue({
				buffer: Buffer.from('x'),
				filePath: 'photos/file_1.jpg',
			});

			await expect(service.getMedia('u1', 555, 'm1')).resolves.toMatchObject({
				mimeType: 'application/octet-stream',
				fileName: 'file_1.jpg',
			});
		});

		it('does not know a message without a file, or from someone else', async () => {
			const { service, bot } = build({ connection: { token: 'ENC' } });
			bot.downloadFile = jest.fn();

			await expect(service.getMedia('u1', 555, 'm1')).rejects.toBeInstanceOf(
				TelegramMediaNotFoundException,
			);
			expect(bot.downloadFile).not.toHaveBeenCalled();
		});

		it('refuses when no bot is connected', async () => {
			await expect(
				build().service.getMedia('u1', 555, 'm1'),
			).rejects.toBeInstanceOf(TelegramNotConnectedException);
		});
	});

	describe('sendMessage', () => {
		const chat = { chatId: 555, telegramUserId: 555 };

		it('sends through the bot, then keeps the message and updates the inbox', async () => {
			const { service, bot, messages, chats } = build({
				connection: { token: 'ENC' },
				chat,
			});
			bot.sendMessage = jest
				.fn()
				.mockResolvedValue({ messageId: 42, sentAt: new Date('2030-01-02') });

			const result = await service.sendMessage(
				{ ownerUserId: 'u1', employeeId: 'e1' },
				555,
				'claro!',
			);

			expect(bot.sendMessage).toHaveBeenCalledWith(TOKEN, 555, 'claro!');
			expect(messages.saveOutgoing).toHaveBeenCalledWith('u1', {
				chatId: 555,
				messageId: 42,
				text: 'claro!',
				sentAt: new Date('2030-01-02'),
				sentByEmployeeId: 'e1',
			});
			expect(chats.registerOutgoing).toHaveBeenCalledWith(
				'u1',
				555,
				'claro!',
				new Date('2030-01-02'),
			);
			expect(result).toEqual({ _id: 'out1', text: 'claro!' });
		});

		it('refuses when no bot is connected, sending nothing', async () => {
			const { service, bot } = build({ chat });
			bot.sendMessage = jest.fn();

			await expect(service.sendMessage(CTX, 555, 'oi')).rejects.toBeInstanceOf(
				TelegramNotConnectedException,
			);
			expect(bot.sendMessage).not.toHaveBeenCalled();
		});

		it("refuses a conversation that is not this user's", async () => {
			const { service, bot } = build({ connection: { token: 'ENC' } });
			bot.sendMessage = jest.fn();

			await expect(service.sendMessage(CTX, 999, 'oi')).rejects.toBeInstanceOf(
				TelegramChatNotFoundException,
			);
			expect(bot.sendMessage).not.toHaveBeenCalled();
		});

		it.each([403, 400])(
			'explains when Telegram refuses (status %p), keeping nothing',
			async (status) => {
				const { service, bot, messages, chats } = build({
					connection: { token: 'ENC' },
					chat,
				});
				bot.sendMessage = jest
					.fn()
					.mockRejectedValue(
						new TelegramApiError(
							status,
							'Forbidden: bot was blocked by the user',
						),
					);

				const error = await service.sendMessage(CTX, 555, 'oi').catch((e) => e);

				expect(error).toBeInstanceOf(TelegramChatUnavailableException);
				expect(JSON.stringify(error.getResponse())).toContain(
					'blocked by the user',
				);
				expect(messages.saveOutgoing).not.toHaveBeenCalled();
				expect(chats.registerOutgoing).not.toHaveBeenCalled();
			},
		);

		it('lets other failures through, such as Telegram being unreachable', async () => {
			const { service, bot } = build({ connection: { token: 'ENC' }, chat });
			bot.sendMessage = jest
				.fn()
				.mockRejectedValue(
					new TelegramApiError(0, 'Could not reach Telegram.'),
				);

			await expect(service.sendMessage(CTX, 555, 'oi')).rejects.toBeInstanceOf(
				TelegramApiError,
			);
		});
	});

	describe('listChats', () => {
		it('lists the conversations with the name of the customer each one is linked to', async () => {
			const { service, chats, customers } = build();
			chats.list.mockResolvedValue([
				{
					chatId: 1,
					telegramUserId: 1,
					firstName: 'Ana',
					customerId: 'cu1',
					unreadCount: 2,
					lastMessageText: 'oi',
					lastMessageDirection: 'IN',
					lastContentType: 'TEXT',
					lastMessageAt: new Date('2030-01-01'),
				},
				{
					chatId: 2,
					telegramUserId: 2,
					firstName: 'Bia',
					customerId: null,
					unreadCount: 0,
					lastMessageText: 'ok',
					lastMessageDirection: 'OUT',
					lastContentType: 'TEXT',
					lastMessageAt: new Date('2030-01-02'),
				},
			]);
			customers.findNames.mockResolvedValue([
				{ _id: 'cu1', name: 'Ana Cliente' },
			]);

			const view = await service.listChats('u1');

			expect(customers.findNames).toHaveBeenCalledWith('u1', ['cu1']);
			expect(view[0]).toMatchObject({
				chatId: 1,
				customerId: 'cu1',
				customerName: 'Ana Cliente',
				unreadCount: 2,
			});
			expect(view[1]).toMatchObject({
				chatId: 2,
				customerId: null,
				customerName: null,
			});
		});

		it('does not ask for customer names when nobody is linked', async () => {
			const { service, chats, customers } = build();
			chats.list.mockResolvedValue([{ chatId: 2, customerId: null }]);

			await service.listChats('u1');

			expect(customers.findNames).not.toHaveBeenCalled();
		});
	});

	describe('getChatMessages and markRead', () => {
		it('returns the messages of a conversation of this user', async () => {
			const { service, messages } = build({ chat: { chatId: 555 } });

			await expect(
				service.getChatMessages('u1', 555, { limit: 20, before: 'abc' }),
			).resolves.toEqual([{ _id: 'm1' }]);
			expect(messages.listByChat).toHaveBeenCalledWith('u1', 555, {
				limit: 20,
				before: 'abc',
			});
		});

		it("refuses a conversation that is not this user's", async () => {
			const { service, messages } = build();

			await expect(
				service.getChatMessages('u1', 555, {}),
			).rejects.toBeInstanceOf(TelegramChatNotFoundException);
			expect(messages.listByChat).not.toHaveBeenCalled();
		});

		it('markRead clears the unread count of that conversation only', async () => {
			const { service, chats } = build({ chat: { chatId: 555 } });

			await service.markRead('u1', 555);

			expect(chats.markRead).toHaveBeenCalledWith('u1', 555);
		});

		it('markRead refuses an unknown conversation', async () => {
			await expect(build().service.markRead('u1', 555)).rejects.toBeInstanceOf(
				TelegramChatNotFoundException,
			);
		});
	});

	describe('linking a conversation to a customer', () => {
		const chat = {
			chatId: 555,
			telegramUserId: 777,
			firstName: 'Ana',
			customerId: null,
		};

		it('links an existing customer: records the Telegram person on the customer and on the chat', async () => {
			const { service, customers, chats } = build({ chat });

			const view = await service.linkCustomer('u1', 555, 'cu1');

			expect(customers.findOwned).toHaveBeenCalledWith('u1', 'cu1');
			expect(customers.linkTelegramSource).toHaveBeenCalledWith(
				'u1',
				'cu1',
				777,
			);
			expect(chats.setCustomer).toHaveBeenCalledWith('u1', 555, 'cu1');
			expect(view).toMatchObject({
				chatId: 555,
				customerId: 'cu1',
				customerName: 'Ana Cliente',
			});
		});

		it("refuses a customer that is not this user's", async () => {
			const { service, customers, chats } = build({ chat });
			customers.findOwned.mockResolvedValue(null);

			await expect(
				service.linkCustomer('u1', 555, 'other'),
			).rejects.toBeInstanceOf(TelegramCustomerNotFoundException);
			expect(chats.setCustomer).not.toHaveBeenCalled();
		});

		it('refuses a conversation that already has a customer', async () => {
			const { service, customers } = build({
				chat: { ...chat, customerId: 'cu7' },
			});

			await expect(
				service.linkCustomer('u1', 555, 'cu1'),
			).rejects.toBeInstanceOf(TelegramChatAlreadyLinkedException);
			expect(customers.linkTelegramSource).not.toHaveBeenCalled();
		});

		it('refuses a customer that already has another Telegram contact', async () => {
			const { service, customers, chats } = build({ chat });
			customers.linkTelegramSource.mockResolvedValue(false);

			await expect(
				service.linkCustomer('u1', 555, 'cu1'),
			).rejects.toBeInstanceOf(TelegramCustomerAlreadyLinkedException);
			expect(chats.setCustomer).not.toHaveBeenCalled();
		});

		it('refuses when that Telegram person already belongs to a different customer (duplicate key)', async () => {
			const { service, customers } = build({ chat });
			customers.linkTelegramSource.mockRejectedValue({ code: 11000 });

			await expect(
				service.linkCustomer('u1', 555, 'cu1'),
			).rejects.toBeInstanceOf(TelegramCustomerAlreadyLinkedException);
		});

		it('refuses an unknown conversation', async () => {
			await expect(
				build().service.linkCustomer('u1', 555, 'cu1'),
			).rejects.toBeInstanceOf(TelegramChatNotFoundException);
		});
	});

	describe('createCustomerFromChat', () => {
		const chat = {
			chatId: 555,
			telegramUserId: 777,
			firstName: 'Ana',
			customerId: null,
		};

		it('creates a customer from the person, within the plan limit, and links the chat', async () => {
			const { service, customers, chats, featureLimits } = build({ chat });

			const view = await service.createCustomerFromChat('u1', 555);

			expect(featureLimits.assertCanCreate).toHaveBeenCalledWith(
				'u1',
				FeatureLimitsEnum.Feature.CUSTOMERS,
			);
			expect(customers.createFromChat).toHaveBeenCalledWith('u1', chat);
			expect(chats.setCustomer).toHaveBeenCalledWith('u1', 555, 'cu9');
			expect(view).toMatchObject({
				customerId: 'cu9',
				customerName: 'Ana Souza',
			});
		});

		it('creates nothing at the customers limit', async () => {
			const { service, customers, chats, featureLimits } = build({ chat });
			featureLimits.assertCanCreate.mockRejectedValue(
				new FeatureLimitReachedException(
					FeatureLimitsEnum.Feature.CUSTOMERS,
					5,
					5,
				),
			);

			await expect(
				service.createCustomerFromChat('u1', 555),
			).rejects.toBeInstanceOf(FeatureLimitReachedException);
			expect(customers.createFromChat).not.toHaveBeenCalled();
			expect(chats.setCustomer).not.toHaveBeenCalled();
		});

		it('adopts the customer that already is this Telegram person instead of making a second one', async () => {
			const { service, customers, chats, featureLimits } = build({ chat });
			customers.findByTelegramUserId.mockResolvedValue({
				_id: 'cu3',
				name: 'Ana Antiga',
			});

			const view = await service.createCustomerFromChat('u1', 555);

			expect(customers.createFromChat).not.toHaveBeenCalled();
			expect(featureLimits.assertCanCreate).not.toHaveBeenCalled();
			expect(chats.setCustomer).toHaveBeenCalledWith('u1', 555, 'cu3');
			expect(view).toMatchObject({
				customerId: 'cu3',
				customerName: 'Ana Antiga',
			});
		});

		it('refuses a conversation that already has a customer', async () => {
			const { service, customers } = build({
				chat: { ...chat, customerId: 'cu7' },
			});

			await expect(
				service.createCustomerFromChat('u1', 555),
			).rejects.toBeInstanceOf(TelegramChatAlreadyLinkedException);
			expect(customers.createFromChat).not.toHaveBeenCalled();
		});
	});

	describe('unlinkCustomer', () => {
		it('removes the Telegram person from the customer and clears the chat, keeping the customer', async () => {
			const { service, customers, chats } = build({
				chat: { chatId: 555, telegramUserId: 777, customerId: 'cu1' },
			});

			const view = await service.unlinkCustomer('u1', 555);

			expect(customers.unlinkTelegramSource).toHaveBeenCalledWith('u1', 'cu1');
			expect(chats.setCustomer).toHaveBeenCalledWith('u1', 555, null);
			expect(view).toMatchObject({ customerId: null, customerName: null });
		});

		it('is harmless for a conversation with no customer', async () => {
			const { service, customers } = build({
				chat: { chatId: 555, telegramUserId: 777, customerId: null },
			});

			await service.unlinkCustomer('u1', 555);

			expect(customers.unlinkTelegramSource).not.toHaveBeenCalled();
		});
	});

	describe('real time: the open pages of the account hear about every change', () => {
		const chat = { chatId: 555, telegramUserId: 555 };

		it('a message that arrived', async () => {
			const { creds, connection } = connectionWithSecret();
			const { service, realtime } = build({ connection });

			await service.handleWebhook(creds.key, creds.secret, textUpdate());

			expect(realtime.notifyInboxUpdated).toHaveBeenCalledWith(
				'u1',
				AppsEnum.App.TELEGRAM,
				'555',
			);
		});

		it('says nothing for a message it already had, or ignored', async () => {
			const { creds, connection } = connectionWithSecret();
			const duplicate = build({ connection });
			duplicate.messages.saveIncoming.mockResolvedValue(false);

			await duplicate.service.handleWebhook(
				creds.key,
				creds.secret,
				textUpdate(),
			);
			expect(duplicate.realtime.notifyInboxUpdated).not.toHaveBeenCalled();

			const ignored = build({ connection, enabledApps: [] });
			await ignored.service.handleWebhook(
				creds.key,
				creds.secret,
				textUpdate(),
			);
			expect(ignored.realtime.notifyInboxUpdated).not.toHaveBeenCalled();
		});

		it('a conversation that was read, a reply that was sent and a message that was deleted', async () => {
			const read = build({ chat });
			await read.service.markRead('u1', 555);
			expect(read.realtime.notifyInboxUpdated).toHaveBeenCalledWith(
				'u1',
				AppsEnum.App.TELEGRAM,
				'555',
			);

			const sent = build({ connection: { token: 'ENC' }, chat });
			sent.bot.sendMessage = jest
				.fn()
				.mockResolvedValue({ messageId: 42, sentAt: new Date('2030-01-02') });
			await sent.service.sendMessage(CTX, 555, 'claro!');
			expect(sent.realtime.notifyInboxUpdated).toHaveBeenCalledTimes(1);

			const deleted = build({ connection: { token: 'ENC' }, chat });
			deleted.messages.findOwned.mockResolvedValue({
				_id: 'm1',
				chatId: 555,
				messageId: 42,
			});
			deleted.bot.deleteMessage = jest.fn().mockResolvedValue(undefined);
			await deleted.service.deleteMessage('u1', 555, 'm1');
			expect(deleted.realtime.notifyInboxUpdated).toHaveBeenCalledTimes(1);
		});

		it('tells nothing when the send was refused', async () => {
			const { service, bot, realtime } = build({
				connection: { token: 'ENC' },
				chat,
			});
			bot.sendMessage = jest
				.fn()
				.mockRejectedValue(
					new TelegramApiError(403, 'Forbidden: bot was blocked'),
				);

			await service.sendMessage(CTX, 555, 'oi').catch(() => undefined);

			expect(realtime.notifyInboxUpdated).not.toHaveBeenCalled();
		});
	});
});
