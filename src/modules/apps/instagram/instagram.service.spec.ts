import FeatureLimitsEnum from '../../feature-limits/interfaces/feature-limits.enum';
import AppsEnum from '../interfaces/apps.enum';
import {
	InstagramAttachmentNotFoundException,
	InstagramChatNotFoundException,
	InstagramMessageNotFoundException,
	InstagramChatUnavailableException,
	InstagramConnectionExpiredException,
	InstagramCustomerAlreadyLinkedException,
	InstagramCustomerNotFoundException,
	InstagramNotConnectedException,
	InstagramReplyWindowClosedException,
} from './instagram.exceptions';
import { InstagramService } from './instagram.service';
import { InstagramApiError } from './instagram.types';

const CTX = { ownerUserId: 'u1', employeeId: 'e1' } as any;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const ACCOUNT = {
	userId: '1789',
	username: 'loja_ana',
	name: 'Loja da Ana',
	profilePictureUrl: null,
	accountType: 'BUSINESS',
};
const LONG = {
	accessToken: 'LONG',
	expiresAt: new Date(Date.now() + 60 * DAY),
};

const connection = (over: any = {}) => ({
	_id: 'c1',
	ownerUserId: 'u1',
	instagramUserId: '1789',
	username: 'loja_ana',
	token: 'ENC',
	tokenExpiresAt: new Date(Date.now() + 50 * DAY),
	...over,
});

const freshChat = (over: any = {}) => ({
	igsid: 'IGSID1',
	name: 'Ana',
	username: 'ana_s',
	customerId: null,
	lastIncomingAt: new Date(Date.now() - HOUR),
	...over,
});

const build = (
	opts: {
		enabledApps?: any;
		accountOwner?: string | null;
		connection?: any;
		chat?: any;
		permissions?: string[];
		account?: any;
	} = {},
) => {
	process.env.SOCIAL_PRICES_URL = 'https://app.example/';

	const graph: any = {
		buildAuthUrl: jest.fn().mockReturnValue('https://instagram.example/dialog'),
		exchangeCode: jest.fn().mockResolvedValue({
			accessToken: 'SHORT',
			permissions: opts.permissions ?? [
				'instagram_business_basic',
				'instagram_business_manage_messages',
			],
		}),
		extendToken: jest.fn().mockResolvedValue(LONG),
		refreshToken: jest.fn().mockResolvedValue({
			accessToken: 'RENEWED',
			expiresAt: new Date(Date.now() + 60 * DAY),
		}),
		getAccount: jest.fn().mockResolvedValue(opts.account ?? ACCOUNT),
		subscribeAccount: jest.fn().mockResolvedValue(undefined),
		unsubscribeAccount: jest.fn().mockResolvedValue(undefined),
		sendText: jest
			.fn()
			.mockResolvedValue({ mid: 'mid.9', sentAt: new Date('2030-01-02') }),
		getProfile: jest.fn().mockResolvedValue({
			name: 'Ana Souza',
			username: 'ana_s',
			profilePic: 'https://x/p.jpg',
		}),
		fetchAttachment: jest.fn().mockResolvedValue({
			buffer: Buffer.from('x'),
			contentType: 'image/jpeg',
		}),
	};
	const oauthState: any = {
		sign: jest.fn().mockResolvedValue('SIGNED'),
		verify: jest
			.fn()
			.mockResolvedValue({ ownerUserId: 'u1', employeeId: null }),
	};
	const conn = 'connection' in opts ? opts.connection : connection();
	const connections: any = {
		findByOwner: jest.fn().mockResolvedValue(conn),
		findWithToken: jest.fn().mockResolvedValue(conn),
		findByAccountId: jest
			.fn()
			.mockResolvedValue(
				opts.accountOwner ? { ownerUserId: opts.accountOwner } : conn,
			),
		readToken: jest.fn().mockReturnValue('LONG'),
		isTokenExpired: jest
			.fn()
			.mockImplementation(
				(c: any) => new Date(c.tokenExpiresAt).getTime() <= Date.now(),
			),
		getStatus: jest.fn().mockResolvedValue({
			connected: !!conn,
			status: conn ? AppsEnum.ConnectionStatus.CONNECTED : null,
			accountLabel: conn ? '@loja_ana' : null,
		}),
		saveConnected: jest.fn().mockResolvedValue({ _id: 'c1' }),
		updateToken: jest.fn().mockResolvedValue(undefined),
		markExpired: jest.fn().mockResolvedValue(undefined),
		touchLastUpdate: jest.fn().mockResolvedValue(undefined),
		deleteByOwner: jest.fn().mockResolvedValue(undefined),
	};
	const users: any = {
		findOneById: jest.fn().mockResolvedValue({
			enabledApps: opts.enabledApps ?? [AppsEnum.App.INSTAGRAM],
		}),
	};
	const chats: any = {
		registerIncoming: jest.fn().mockResolvedValue(false),
		registerEcho: jest.fn().mockResolvedValue(false),
		registerOutgoing: jest.fn().mockResolvedValue(undefined),
		setProfile: jest.fn().mockResolvedValue(undefined),
		markRead: jest.fn().mockResolvedValue(undefined),
		setLastMessage: jest.fn().mockResolvedValue(undefined),
		setCustomer: jest.fn().mockResolvedValue(undefined),
		list: jest.fn().mockResolvedValue([]),
		findByIgsid: jest.fn().mockResolvedValue(opts.chat ?? null),
	};
	const messages: any = {
		saveIncoming: jest.fn().mockResolvedValue(true),
		saveEcho: jest.fn().mockResolvedValue(true),
		saveOutgoing: jest.fn().mockResolvedValue({ _id: 'out1' }),
		listByChat: jest.fn().mockResolvedValue([{ _id: 'm1' }]),
		findOwned: jest.fn().mockResolvedValue(null),
		deleteOwned: jest.fn().mockResolvedValue(true),
		findLatest: jest.fn().mockResolvedValue(null),
	};
	const customers: any = {
		findNames: jest.fn().mockResolvedValue([]),
		findOwned: jest.fn().mockResolvedValue({ _id: 'cu1', name: 'Ana Cliente' }),
		createFromChat: jest
			.fn()
			.mockResolvedValue({ _id: 'cu9', name: 'Ana Souza' }),
	};
	const featureLimits: any = {
		assertCanCreate: jest.fn().mockResolvedValue(undefined),
	};
	const realtime: any = { notifyInboxUpdated: jest.fn() };

	return {
		graph,
		oauthState,
		connections,
		users,
		chats,
		messages,
		customers,
		featureLimits,
		realtime,
		service: new InstagramService(
			graph,
			oauthState,
			connections,
			users,
			chats,
			messages,
			customers,
			featureLimits,
			realtime,
		),
	};
};

const webhookBody = (over: any = {}) => ({
	object: 'instagram',
	entry: [
		{
			id: '1789',
			messaging: [
				{
					sender: { id: 'IGSID1' },
					recipient: { id: '1789' },
					timestamp: 1_760_000_000_000,
					message: { mid: 'm1', text: 'oi', ...over },
				},
			],
		},
	],
});

describe('InstagramService', () => {
	describe('getConnectUrl', () => {
		it('sends the user to Instagram with a state that says who started it', async () => {
			const { service, oauthState, graph } = build();

			await expect(
				service.getConnectUrl({ ownerUserId: 'u1', employeeId: 'e1' } as any),
			).resolves.toBe('https://instagram.example/dialog');

			expect(oauthState.sign).toHaveBeenCalledWith({
				ownerUserId: 'u1',
				employeeId: 'e1',
			});
			expect(graph.buildAuthUrl).toHaveBeenCalledWith('SIGNED');
		});
	});

	describe('handleCallback', () => {
		it('connects the account: long-lived token, subscription to its messages, then saved', async () => {
			const { service, graph, connections } = build();

			const result = await service.handleCallback({ code: 'C', state: 'S' });

			expect(graph.exchangeCode).toHaveBeenCalledWith('C');
			expect(graph.extendToken).toHaveBeenCalledWith('SHORT');
			expect(graph.getAccount).toHaveBeenCalledWith('LONG');
			expect(graph.subscribeAccount).toHaveBeenCalledWith('1789', 'LONG');
			expect(connections.saveConnected).toHaveBeenCalledWith(
				'u1',
				ACCOUNT,
				LONG,
			);
			expect(result).toEqual({
				redirectTo: 'https://app.example/apps/instagram',
			});
		});

		it('takes the "#_" Instagram leaves on the code off', async () => {
			const { service, graph } = build();

			await service.handleCallback({ code: 'C#_', state: 'S' });

			expect(graph.exchangeCode).toHaveBeenCalledWith('C');
		});

		it.each([
			[{ error: 'access_denied', state: 'S' }, 'access_denied'],
			[{ error: 'server_error', state: 'S' }, 'oauth_error'],
			[{ state: 'S' }, 'missing_code'],
		])('turns %p into the code %s, never throwing', async (params, code) => {
			const { service } = build();

			const result = await service.handleCallback(params as any);

			expect(result.redirectTo).toBe(
				`https://app.example/apps/instagram?error=${code}`,
			);
		});

		it('refuses a state that does not verify, and a user without the app', async () => {
			const bad = build();
			bad.oauthState.verify.mockRejectedValue(new Error('bad'));
			expect(
				(await bad.service.handleCallback({ code: 'C', state: 'x' }))
					.redirectTo,
			).toContain('error=invalid_state');
			expect(bad.graph.exchangeCode).not.toHaveBeenCalled();

			const off = build({ enabledApps: [] });
			expect(
				(await off.service.handleCallback({ code: 'C', state: 'S' }))
					.redirectTo,
			).toContain('error=not_enabled');
			expect(off.graph.exchangeCode).not.toHaveBeenCalled();
		});

		it('says so when the message permission was not given', async () => {
			const { service, graph } = build({
				permissions: ['instagram_business_basic'],
			});

			const result = await service.handleCallback({ code: 'C', state: 'S' });

			expect(result.redirectTo).toContain('error=missing_permission');
			expect(graph.extendToken).not.toHaveBeenCalled();
		});

		it('does not refuse for permissions when Instagram does not list them', async () => {
			const { service, connections } = build({ permissions: [] });

			await service.handleCallback({ code: 'C', state: 'S' });

			expect(connections.saveConnected).toHaveBeenCalled();
		});

		it('says so when the account is a personal one, not professional', async () => {
			const { service, connections } = build({
				account: { ...ACCOUNT, accountType: 'PERSONAL' },
			});

			const result = await service.handleCallback({ code: 'C', state: 'S' });

			expect(result.redirectTo).toContain('error=not_professional');
			expect(connections.saveConnected).not.toHaveBeenCalled();
		});

		it('accepts a creator account too', async () => {
			const { service, connections } = build({
				account: { ...ACCOUNT, accountType: 'MEDIA_CREATOR' },
			});

			await service.handleCallback({ code: 'C', state: 'S' });

			expect(connections.saveConnected).toHaveBeenCalled();
		});

		it('says so when the account belongs to another user', async () => {
			const { service, connections } = build({ accountOwner: 'someone-else' });

			const result = await service.handleCallback({ code: 'C', state: 'S' });

			expect(result.redirectTo).toContain('error=account_in_use');
			expect(connections.saveConnected).not.toHaveBeenCalled();
		});

		it('says so when Instagram will not let the app receive the messages', async () => {
			const { service, graph, connections } = build();
			graph.subscribeAccount.mockRejectedValue(
				new InstagramApiError(400, 200, 'no permission'),
			);

			const result = await service.handleCallback({ code: 'C', state: 'S' });

			expect(result.redirectTo).toContain('error=subscribe_failed');
			expect(connections.saveConnected).not.toHaveBeenCalled();
		});

		it('any other failure is a short code, not an error page', async () => {
			const { service, graph } = build();
			graph.exchangeCode.mockRejectedValue(
				new InstagramApiError(0, null, 'down'),
			);

			const result = await service.handleCallback({ code: 'C', state: 'S' });

			expect(result.redirectTo).toContain('error=connection_failed');
		});
	});

	describe('getConnection and disconnect', () => {
		it('shows the account and whether it is connected, never a token', async () => {
			const { service } = build({
				connection: connection({
					name: 'Loja da Ana',
					connectedAt: new Date('2030-01-01'),
				}),
			});

			await expect(service.getConnection('u1')).resolves.toEqual({
				connected: true,
				status: AppsEnum.ConnectionStatus.CONNECTED,
				instagramUserId: '1789',
				username: 'loja_ana',
				name: 'Loja da Ana',
				profilePictureUrl: null,
				connectedAt: new Date('2030-01-01'),
				lastUpdateAt: null,
			});
		});

		it('is not connected with no connection at all', async () => {
			const { service } = build({ connection: null });

			await expect(service.getConnection('u1')).resolves.toMatchObject({
				connected: false,
				status: null,
				username: null,
			});
		});

		it('disconnect stops the messages of the account, then forgets the connection', async () => {
			const { service, graph, connections } = build();

			await service.disconnect(CTX);

			expect(graph.unsubscribeAccount).toHaveBeenCalledWith('1789', 'LONG');
			expect(connections.deleteByOwner).toHaveBeenCalledWith('u1');
		});

		it('still forgets it when Instagram cannot be reached, or the token already expired', async () => {
			const down = build();
			down.graph.unsubscribeAccount.mockRejectedValue(
				new InstagramApiError(0, null, 'down'),
			);
			await down.service.disconnect(CTX);
			expect(down.connections.deleteByOwner).toHaveBeenCalledWith('u1');

			const expired = build({
				connection: connection({ tokenExpiresAt: new Date(Date.now() - 1000) }),
			});
			await expired.service.disconnect(CTX);
			expect(expired.graph.unsubscribeAccount).not.toHaveBeenCalled();
			expect(expired.connections.deleteByOwner).toHaveBeenCalledWith('u1');
		});
	});

	describe('handleWebhook', () => {
		it('stores the message for the owner of that account and updates the inbox', async () => {
			const { service, messages, chats, connections, realtime } = build();

			await service.handleWebhook(webhookBody());

			expect(connections.findByAccountId).toHaveBeenCalledWith('1789');
			expect(messages.saveIncoming).toHaveBeenCalledWith(
				'u1',
				expect.objectContaining({ igsid: 'IGSID1', mid: 'm1', text: 'oi' }),
			);
			expect(chats.registerIncoming).toHaveBeenCalled();
			expect(connections.touchLastUpdate).toHaveBeenCalledWith(
				'c1',
				expect.any(Date),
			);
			expect(realtime.notifyInboxUpdated).toHaveBeenCalledWith(
				'u1',
				AppsEnum.App.INSTAGRAM,
				'IGSID1',
			);
		});

		it('does nothing more for a message it already had', async () => {
			const { service, messages, chats, realtime } = build();
			messages.saveIncoming.mockResolvedValue(false);

			await service.handleWebhook(webhookBody());

			expect(chats.registerIncoming).not.toHaveBeenCalled();
			expect(realtime.notifyInboxUpdated).not.toHaveBeenCalled();
		});

		it('ignores an account nobody connected, and a user without the app', async () => {
			const unknown = build();
			unknown.connections.findByAccountId.mockResolvedValue(null);
			await unknown.service.handleWebhook(webhookBody());
			expect(unknown.messages.saveIncoming).not.toHaveBeenCalled();

			const disabled = build({ enabledApps: [] });
			await disabled.service.handleWebhook(webhookBody());
			expect(disabled.messages.saveIncoming).not.toHaveBeenCalled();
		});

		it('learns the name, username and picture on the first message', async () => {
			const { service, chats, graph } = build();
			chats.registerIncoming.mockResolvedValue(true);

			await service.handleWebhook(webhookBody());

			expect(graph.getProfile).toHaveBeenCalledWith('LONG', 'IGSID1');
			expect(chats.setProfile).toHaveBeenCalledWith('u1', 'IGSID1', {
				name: 'Ana Souza',
				username: 'ana_s',
				profilePic: 'https://x/p.jpg',
			});
		});

		it('keeps the message even when the profile cannot be read, and does not ask with an expired token', async () => {
			const refused = build();
			refused.chats.registerIncoming.mockResolvedValue(true);
			refused.graph.getProfile.mockRejectedValue(
				new InstagramApiError(400, 100, 'no'),
			);
			await refused.service.handleWebhook(webhookBody());
			expect(refused.messages.saveIncoming).toHaveBeenCalled();
			expect(refused.chats.setProfile).not.toHaveBeenCalled();

			const expired = build({
				connection: connection({ tokenExpiresAt: new Date(Date.now() - 1000) }),
			});
			expired.chats.registerIncoming.mockResolvedValue(true);
			await expired.service.handleWebhook(webhookBody());
			expect(expired.graph.getProfile).not.toHaveBeenCalled();
			expect(expired.messages.saveIncoming).toHaveBeenCalled();
		});

		it('tries the profile again on a later message while the conversation has no name', async () => {
			const nameless = build({
				chat: { igsid: 'IGSID1', name: null, username: null },
			});
			await nameless.service.handleWebhook(webhookBody());
			expect(nameless.graph.getProfile).toHaveBeenCalled();

			const named = build({
				chat: { igsid: 'IGSID1', name: null, username: 'ana_s' },
			});
			await named.service.handleWebhook(webhookBody());
			expect(named.graph.getProfile).not.toHaveBeenCalled();
		});

		it('lets a storage failure through, so Instagram delivers again', async () => {
			const { service, messages } = build();
			messages.saveIncoming.mockRejectedValue(new Error('db down'));

			await expect(service.handleWebhook(webhookBody())).rejects.toThrow(
				'db down',
			);
		});

		it('ignores a body that is not a customer message', async () => {
			const { service, messages } = build();

			await service.handleWebhook({ object: 'instagram', entry: [] });
			await service.handleWebhook(null as any);

			expect(messages.saveIncoming).not.toHaveBeenCalled();
		});

		describe('echoes: what the account sent from the Instagram app', () => {
			const echoBody = () => ({
				object: 'instagram',
				entry: [
					{
						id: '1789',
						messaging: [
							{
								sender: { id: '1789' },
								recipient: { id: 'IGSID1' },
								timestamp: 1_760_000_000_000,
								message: { mid: 'e1', text: 'pelo app', is_echo: true },
							},
						],
					},
				],
			});

			it('keeps it as a message the account sent, in the conversation of the person it went to', async () => {
				const { service, messages, chats, realtime } = build();

				await service.handleWebhook(echoBody());

				expect(messages.saveEcho).toHaveBeenCalledWith(
					'u1',
					expect.objectContaining({ igsid: 'IGSID1', mid: 'e1' }),
				);
				expect(messages.saveIncoming).not.toHaveBeenCalled();
				expect(chats.registerEcho).toHaveBeenCalled();
				expect(realtime.notifyInboxUpdated).toHaveBeenCalledWith(
					'u1',
					AppsEnum.App.INSTAGRAM,
					'IGSID1',
				);
			});

			it('does nothing more for an echo it already had, such as one of a reply sent from here', async () => {
				const { service, messages, chats, realtime } = build();
				messages.saveEcho.mockResolvedValue(false);

				await service.handleWebhook(echoBody());

				expect(chats.registerEcho).not.toHaveBeenCalled();
				expect(realtime.notifyInboxUpdated).not.toHaveBeenCalled();
			});

			it('learns who the person is when the account wrote first', async () => {
				const { service, chats, graph } = build();
				chats.registerEcho.mockResolvedValue(true);

				await service.handleWebhook(echoBody());

				expect(graph.getProfile).toHaveBeenCalledWith('LONG', 'IGSID1');
			});
		});
	});

	describe('listChats', () => {
		it('shows the customer name and whether the 24 hour window is still open', async () => {
			const { service, chats, customers } = build();
			chats.list.mockResolvedValue([
				freshChat({ customerId: 'cu1' }),
				freshChat({
					igsid: 'IGSID2',
					lastIncomingAt: new Date(Date.now() - 25 * HOUR),
				}),
			]);
			customers.findNames.mockResolvedValue([
				{ _id: 'cu1', name: 'Ana Cliente' },
			]);

			const views = await service.listChats('u1');

			expect(views[0]).toMatchObject({
				igsid: 'IGSID1',
				username: 'ana_s',
				customerName: 'Ana Cliente',
				canReply: true,
			});
			expect(views[1]).toMatchObject({ igsid: 'IGSID2', canReply: false });
		});
	});

	describe('sendMessage', () => {
		it('answers through the account, then keeps the message and updates the inbox', async () => {
			const { service, graph, messages, chats, realtime } = build({
				chat: freshChat(),
			});

			await service.sendMessage(CTX, 'IGSID1', 'claro!');

			expect(graph.sendText).toHaveBeenCalledWith(
				'LONG',
				'1789',
				'IGSID1',
				'claro!',
			);
			expect(messages.saveOutgoing).toHaveBeenCalledWith('u1', {
				igsid: 'IGSID1',
				mid: 'mid.9',
				text: 'claro!',
				sentAt: new Date('2030-01-02'),
				sentByEmployeeId: 'e1',
			});
			expect(chats.registerOutgoing).toHaveBeenCalledWith(
				'u1',
				'IGSID1',
				'claro!',
				new Date('2030-01-02'),
			);
			expect(realtime.notifyInboxUpdated).toHaveBeenCalledTimes(1);
		});

		it("refuses, sending nothing, when nothing is connected, the conversation is not this user's, or the window closed", async () => {
			await expect(
				build({ chat: freshChat(), connection: null }).service.sendMessage(
					CTX,
					'IGSID1',
					'oi',
				),
			).rejects.toBeInstanceOf(InstagramNotConnectedException);

			await expect(
				build({ chat: null }).service.sendMessage(CTX, 'IGSID9', 'oi'),
			).rejects.toBeInstanceOf(InstagramChatNotFoundException);

			const closed = build({
				chat: freshChat({ lastIncomingAt: new Date(Date.now() - 25 * HOUR) }),
			});
			await expect(
				closed.service.sendMessage(CTX, 'IGSID1', 'oi'),
			).rejects.toBeInstanceOf(InstagramReplyWindowClosedException);
			expect(closed.graph.sendText).not.toHaveBeenCalled();
		});

		it('explains when Instagram says the window closed or the person is unreachable, keeping nothing', async () => {
			const closed = build({ chat: freshChat() });
			closed.graph.sendText.mockRejectedValue(
				new InstagramApiError(400, 10, 'outside window'),
			);
			await expect(
				closed.service.sendMessage(CTX, 'IGSID1', 'oi'),
			).rejects.toBeInstanceOf(InstagramReplyWindowClosedException);
			expect(closed.messages.saveOutgoing).not.toHaveBeenCalled();
			expect(closed.realtime.notifyInboxUpdated).not.toHaveBeenCalled();

			const blocked = build({ chat: freshChat() });
			blocked.graph.sendText.mockRejectedValue(
				new InstagramApiError(400, 551, 'unavailable'),
			);
			await expect(
				blocked.service.sendMessage(CTX, 'IGSID1', 'oi'),
			).rejects.toBeInstanceOf(InstagramChatUnavailableException);
		});

		it('lets other failures through, such as Instagram being unreachable', async () => {
			const { service, graph } = build({ chat: freshChat() });
			graph.sendText.mockRejectedValue(new InstagramApiError(0, null, 'down'));

			await expect(
				service.sendMessage(CTX, 'IGSID1', 'oi'),
			).rejects.toBeInstanceOf(InstagramApiError);
		});

		describe('the token lasts 60 days', () => {
			it('refuses, and says it expired, once it ran out', async () => {
				const { service, graph, connections } = build({
					chat: freshChat(),
					connection: connection({
						tokenExpiresAt: new Date(Date.now() - 1000),
					}),
				});

				await expect(
					service.sendMessage(CTX, 'IGSID1', 'oi'),
				).rejects.toBeInstanceOf(InstagramConnectionExpiredException);
				expect(connections.markExpired).toHaveBeenCalledWith('c1');
				expect(graph.sendText).not.toHaveBeenCalled();
			});

			it('renews it when less than half is left, and sends with the new one', async () => {
				const { service, graph, connections } = build({
					chat: freshChat(),
					connection: connection({
						tokenExpiresAt: new Date(Date.now() + 10 * DAY),
					}),
				});

				await service.sendMessage(CTX, 'IGSID1', 'oi');

				expect(graph.refreshToken).toHaveBeenCalledWith('LONG');
				expect(connections.updateToken).toHaveBeenCalledWith(
					'c1',
					expect.objectContaining({ accessToken: 'RENEWED' }),
				);
				expect(graph.sendText.mock.calls[0][0]).toBe('RENEWED');
			});

			it('leaves a token that is still young alone', async () => {
				const { service, graph } = build({ chat: freshChat() });

				await service.sendMessage(CTX, 'IGSID1', 'oi');

				expect(graph.refreshToken).not.toHaveBeenCalled();
			});

			it('sends with the old one when renewing fails, to try again next time', async () => {
				const { service, graph, connections } = build({
					chat: freshChat(),
					connection: connection({
						tokenExpiresAt: new Date(Date.now() + 10 * DAY),
					}),
				});
				graph.refreshToken.mockRejectedValue(
					new InstagramApiError(0, null, 'down'),
				);

				await service.sendMessage(CTX, 'IGSID1', 'oi');

				expect(connections.updateToken).not.toHaveBeenCalled();
				expect(graph.sendText.mock.calls[0][0]).toBe('LONG');
			});
		});
	});

	describe('conversation', () => {
		it('getChatMessages and markRead only for a conversation of this user', async () => {
			const { service, messages, chats, realtime } = build({
				chat: freshChat(),
			});

			await service.getChatMessages('u1', 'IGSID1', { limit: 10 });
			await service.markRead('u1', 'IGSID1');

			expect(messages.listByChat).toHaveBeenCalledWith('u1', 'IGSID1', {
				limit: 10,
			});
			expect(chats.markRead).toHaveBeenCalledWith('u1', 'IGSID1');
			expect(realtime.notifyInboxUpdated).toHaveBeenCalledTimes(1);

			const none = build({ chat: null });
			await expect(
				none.service.getChatMessages('u1', 'x', {}),
			).rejects.toBeInstanceOf(InstagramChatNotFoundException);
			await expect(none.service.markRead('u1', 'x')).rejects.toBeInstanceOf(
				InstagramChatNotFoundException,
			);
		});
	});

	describe('customer link', () => {
		it("linkCustomer ties the person to one of the user's customers", async () => {
			const { service, chats } = build({ chat: freshChat() });

			const view = await service.linkCustomer('u1', 'IGSID1', 'cu1');

			expect(chats.setCustomer).toHaveBeenCalledWith('u1', 'IGSID1', 'cu1');
			expect(view).toMatchObject({
				customerId: 'cu1',
				customerName: 'Ana Cliente',
			});
		});

		it("linkCustomer refuses a customer that is not this user's, one already linked, and a chat already linked", async () => {
			const foreign = build({ chat: freshChat() });
			foreign.customers.findOwned.mockResolvedValue(null);
			await expect(
				foreign.service.linkCustomer('u1', 'IGSID1', 'x'),
			).rejects.toBeInstanceOf(InstagramCustomerNotFoundException);

			const linked = build({ chat: freshChat({ customerId: 'cu0' }) });
			await expect(
				linked.service.linkCustomer('u1', 'IGSID1', 'cu1'),
			).rejects.toBeInstanceOf(InstagramCustomerAlreadyLinkedException);
		});

		it('createCustomerFromChat checks the plan limit, then makes and links the customer', async () => {
			const { service, featureLimits, customers, chats } = build({
				chat: freshChat(),
			});

			const view = await service.createCustomerFromChat('u1', 'IGSID1');

			expect(featureLimits.assertCanCreate).toHaveBeenCalledWith(
				'u1',
				FeatureLimitsEnum.Feature.CUSTOMERS,
			);
			expect(customers.createFromChat).toHaveBeenCalled();
			expect(chats.setCustomer).toHaveBeenCalledWith('u1', 'IGSID1', 'cu9');
			expect(view.customerId).toBe('cu9');
		});

		it('unlinkCustomer cuts the link and keeps the customer', async () => {
			const { service, chats } = build({
				chat: freshChat({ customerId: 'cu1' }),
			});

			const view = await service.unlinkCustomer('u1', 'IGSID1');

			expect(chats.setCustomer).toHaveBeenCalledWith('u1', 'IGSID1', null);
			expect(view.customerId).toBeNull();
		});
	});

	describe('deleteMessage', () => {
		it('removes the message from the inbox, shows the newest one that is left and tells the open pages', async () => {
			const { service, messages, chats, realtime } = build({
				chat: freshChat(),
			});
			const latest = { _id: 'm0', text: 'antes' };
			messages.findLatest.mockResolvedValue(latest);

			await service.deleteMessage('u1', 'IGSID1', 'm1');

			expect(messages.deleteOwned).toHaveBeenCalledWith('u1', 'IGSID1', 'm1');
			expect(chats.setLastMessage).toHaveBeenCalledWith('u1', 'IGSID1', latest);
			expect(realtime.notifyInboxUpdated).toHaveBeenCalled();
		});

		it("refuses a message that is not there, and a conversation that is not this user's", async () => {
			const gone = build({ chat: freshChat() });
			gone.messages.deleteOwned.mockResolvedValue(false);
			await expect(
				gone.service.deleteMessage('u1', 'IGSID1', 'm1'),
			).rejects.toBeInstanceOf(InstagramMessageNotFoundException);
			expect(gone.chats.setLastMessage).not.toHaveBeenCalled();

			const none = build({ chat: null });
			await expect(
				none.service.deleteMessage('u1', 'x', 'm1'),
			).rejects.toBeInstanceOf(InstagramChatNotFoundException);
		});

		it('leaves the preview alone when no message is left', async () => {
			const { service, chats } = build({ chat: freshChat() });

			await service.deleteMessage('u1', 'IGSID1', 'm1');

			expect(chats.setLastMessage).not.toHaveBeenCalled();
		});
	});

	describe('getAttachment', () => {
		const record = {
			attachments: [
				{ type: 'image', url: 'https://scontent.cdninstagram.com/a.jpg' },
				{ type: 'file', url: 'https://cdn.fbsbx.com/b.pdf' },
			],
		};

		it('fetches the file of one message from Instagram, for this user only', async () => {
			const { service, graph, messages } = build({ chat: freshChat() });
			messages.findOwned.mockResolvedValue(record);

			const result = await service.getAttachment('u1', 'IGSID1', 'm1', 1);

			expect(messages.findOwned).toHaveBeenCalledWith('u1', 'IGSID1', 'm1');
			expect(graph.fetchAttachment).toHaveBeenCalledWith(
				'https://cdn.fbsbx.com/b.pdf',
			);
			expect(result).toMatchObject({ contentType: 'image/jpeg' });
		});

		it("does not know a message that is not this user's, or a file it does not have", async () => {
			const none = build({ chat: freshChat() });
			await expect(
				none.service.getAttachment('u1', 'IGSID1', 'm1', 0),
			).rejects.toBeInstanceOf(InstagramAttachmentNotFoundException);

			const { service, messages, graph } = build({ chat: freshChat() });
			messages.findOwned.mockResolvedValue(record);
			await expect(
				service.getAttachment('u1', 'IGSID1', 'm1', 5),
			).rejects.toBeInstanceOf(InstagramAttachmentNotFoundException);
			expect(graph.fetchAttachment).not.toHaveBeenCalled();
		});
	});
});
