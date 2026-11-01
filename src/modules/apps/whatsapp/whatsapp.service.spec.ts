import AppsEnum from '../interfaces/apps.enum';
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
import { WhatsappService } from './whatsapp.service';
import { WhatsappApiError } from './whatsapp.types';

const HOUR = 3600_000;
const ctx = { ownerUserId: 'u1', employeeId: 'e1' };

const connection = (over: any = {}) => ({
	_id: 'cn1',
	ownerUserId: 'u1',
	status: AppsEnum.ConnectionStatus.CONNECTED,
	wabaId: 'WABA1',
	phoneNumberId: 'PN1',
	displayPhoneNumber: '+55 85 99999-0000',
	verifiedName: 'Loja',
	token: 'ENC',
	connectedAt: new Date('2030-01-01'),
	lastUpdateAt: null,
	...over,
});

const conversation = (over: any = {}) => ({
	_id: 'c1',
	contactKey: '5585988887777',
	lastIncomingAt: new Date(Date.now() - HOUR),
	...over,
});

const webhook = (over: any = {}) => ({
	object: 'whatsapp_business_account',
	entry: [
		{
			changes: [
				{
					field: 'messages',
					value: {
						metadata: { phone_number_id: 'PN1' },
						contacts: [{ profile: { name: 'Ana' }, wa_id: '5585988887777' }],
						messages: [
							{
								from: '5585988887777',
								id: 'wamid.1',
								timestamp: '1760000000',
								type: 'text',
								text: { body: 'oi' },
							},
						],
						...over,
					},
				},
			],
		},
	],
});

const build = (
	opts: { connection?: any; conversation?: any; enabledApps?: any } = {},
) => {
	const conn = 'connection' in opts ? opts.connection : connection();

	const graph: any = {
		exchangeCode: jest.fn().mockResolvedValue('BIZTOKEN'),
		getNumber: jest.fn().mockResolvedValue({
			displayPhoneNumber: '+55 85 99999-0000',
			verifiedName: 'Loja',
		}),
		subscribeApp: jest.fn().mockResolvedValue(undefined),
		unsubscribeApp: jest.fn().mockResolvedValue(undefined),
		registerNumber: jest.fn().mockResolvedValue(undefined),
		sendText: jest
			.fn()
			.mockResolvedValue({ mid: 'wamid.out1', sentAt: new Date('2030-01-02') }),
		sendMedia: jest.fn().mockResolvedValue({
			mid: 'wamid.out2',
			sentAt: new Date('2030-01-02'),
			mediaId: 'MID1',
			type: 'image',
		}),
		getMedia: jest.fn().mockResolvedValue({
			url: 'https://lookaside.fbsbx.com/x',
			mimeType: 'image/jpeg',
		}),
		downloadMedia: jest.fn().mockResolvedValue({
			buffer: Buffer.alloc(2),
			contentType: 'application/octet-stream',
		}),
	};
	const connections: any = {
		findByOwner: jest.fn().mockResolvedValue(conn),
		findWithToken: jest.fn().mockResolvedValue(conn),
		findByPhoneNumberId: jest.fn().mockResolvedValue(conn),
		readToken: jest.fn().mockReturnValue('TOKEN'),
		saveConnected: jest.fn().mockResolvedValue(connection()),
		markRevoked: jest.fn().mockResolvedValue(undefined),
		touchLastUpdate: jest.fn().mockResolvedValue(undefined),
		deleteByOwner: jest.fn().mockResolvedValue(undefined),
	};
	const users: any = {
		findOneById: jest.fn().mockResolvedValue({
			enabledApps: opts.enabledApps ?? [AppsEnum.App.WHATSAPP],
		}),
	};
	const conversations: any = {
		ensure: jest
			.fn()
			.mockResolvedValue({ conversation: conversation(), created: true }),
		applyIncoming: jest.fn().mockResolvedValue(true),
		applyOutgoing: jest.fn().mockResolvedValue(undefined),
		findByKey: jest
			.fn()
			.mockResolvedValue(
				'conversation' in opts ? opts.conversation : conversation(),
			),
	};
	const messages: any = {
		saveIncoming: jest.fn().mockResolvedValue(true),
		saveOutgoing: jest.fn().mockResolvedValue({ _id: 'out1' }),
	};
	const realtime: any = { notifyInboxUpdated: jest.fn() };

	return {
		graph,
		connections,
		users,
		conversations,
		messages,
		realtime,
		service: new WhatsappService(
			graph,
			connections,
			users,
			conversations,
			messages,
			realtime,
		),
	};
};

describe('WhatsappService', () => {
	describe('getConnectConfig', () => {
		const saved = { ...process.env };

		afterEach(() => {
			process.env = { ...saved };
		});

		it('gives the browser what it needs to open Embedded Signup', () => {
			process.env.WHATSAPP_APP_ID = 'APP';
			process.env.WHATSAPP_CONFIG_ID = 'CFG';
			process.env.WHATSAPP_GRAPH_VERSION = 'v99.0';

			expect(build().service.getConnectConfig()).toEqual({
				appId: 'APP',
				configId: 'CFG',
				graphVersion: 'v99.0',
			});
		});

		it('says so when the server was not set up', () => {
			delete process.env.WHATSAPP_APP_ID;

			expect(() => build().service.getConnectConfig()).toThrow(
				WhatsappNotConfiguredException,
			);
		});
	});

	describe('getConnection', () => {
		it('shows the number, never a token', async () => {
			const view = await build().service.getConnection('u1');

			expect(view).toMatchObject({
				connected: true,
				phoneNumberId: 'PN1',
				displayPhoneNumber: '+55 85 99999-0000',
				verifiedName: 'Loja',
			});
			expect(JSON.stringify(view)).not.toContain('ENC');
		});

		it('is not connected without a connection, or once Meta revoked it', async () => {
			expect(
				(await build({ connection: null }).service.getConnection('u1'))
					.connected,
			).toBe(false);

			const revoked = build({
				connection: connection({ status: AppsEnum.ConnectionStatus.REVOKED }),
			});
			expect((await revoked.service.getConnection('u1')).connected).toBe(false);
		});
	});

	describe('connect', () => {
		const data = { code: 'CODE', wabaId: 'WABA1', phoneNumberId: 'PN1' };

		it('trades the code for a token, reads the number, subscribes the app, registers the number and saves', async () => {
			const { service, graph, connections } = build({ connection: null });
			connections.findByPhoneNumberId.mockResolvedValue(null);

			const view = await service.connect(ctx, data);

			expect(graph.exchangeCode).toHaveBeenCalledWith('CODE');
			expect(graph.getNumber).toHaveBeenCalledWith('BIZTOKEN', 'PN1');
			expect(graph.subscribeApp).toHaveBeenCalledWith('WABA1', 'BIZTOKEN');
			expect(graph.registerNumber).toHaveBeenCalledWith(
				'PN1',
				'BIZTOKEN',
				expect.stringMatching(/^\d{6}$/),
			);
			expect(connections.saveConnected).toHaveBeenCalledWith('u1', {
				wabaId: 'WABA1',
				phoneNumberId: 'PN1',
				number: {
					displayPhoneNumber: '+55 85 99999-0000',
					verifiedName: 'Loja',
				},
				accessToken: 'BIZTOKEN',
				pin: expect.stringMatching(/^\d{6}$/),
			});
			expect(view.connected).toBe(true);
		});

		it('still connects when the number was already registered', async () => {
			const { service, graph, connections } = build();
			connections.findByPhoneNumberId.mockResolvedValue(null);
			graph.registerNumber.mockRejectedValue(
				new WhatsappApiError(400, 100, 'already registered'),
			);

			await expect(service.connect(ctx, data)).resolves.toMatchObject({
				connected: true,
			});
		});

		it('refuses a number that belongs to another user, saving nothing', async () => {
			const { service, graph, connections } = build();
			connections.findByPhoneNumberId.mockResolvedValue(
				connection({ ownerUserId: 'other' }),
			);

			await expect(service.connect(ctx, data)).rejects.toBeInstanceOf(
				WhatsappNumberAlreadyConnectedException,
			);
			expect(graph.subscribeApp).not.toHaveBeenCalled();
			expect(connections.saveConnected).not.toHaveBeenCalled();
		});

		it('says why when Meta refuses the code or the number, and when the app cannot receive its messages', async () => {
			const badCode = build();
			badCode.graph.exchangeCode.mockRejectedValue(
				new WhatsappApiError(400, 100, 'bad code'),
			);
			await expect(badCode.service.connect(ctx, data)).rejects.toBeInstanceOf(
				WhatsappConnectFailedException,
			);

			const noSubscribe = build();
			noSubscribe.connections.findByPhoneNumberId.mockResolvedValue(null);
			noSubscribe.graph.subscribeApp.mockRejectedValue(
				new WhatsappApiError(403, 200, 'no permission'),
			);
			await expect(
				noSubscribe.service.connect(ctx, data),
			).rejects.toBeInstanceOf(WhatsappSubscribeFailedException);
			expect(noSubscribe.connections.saveConnected).not.toHaveBeenCalled();
		});
	});

	describe('disconnect', () => {
		it('stops the webhook and forgets the connection', async () => {
			const { service, graph, connections } = build();

			await service.disconnect(ctx);

			expect(graph.unsubscribeApp).toHaveBeenCalledWith('WABA1', 'TOKEN');
			expect(connections.deleteByOwner).toHaveBeenCalledWith('u1');
		});

		it('forgets it even when Meta no longer knows the subscription, and does nothing without one', async () => {
			const failing = build();
			failing.graph.unsubscribeApp.mockRejectedValue(
				new WhatsappApiError(400, 100, 'gone'),
			);
			await failing.service.disconnect(ctx);
			expect(failing.connections.deleteByOwner).toHaveBeenCalled();

			const none = build({ connection: null });
			await none.service.disconnect(ctx);
			expect(none.connections.deleteByOwner).not.toHaveBeenCalled();
		});
	});

	describe('handleWebhook', () => {
		it('keeps the message in the conversation of the person, with their name and the raw event, and tells the open pages', async () => {
			const { service, conversations, messages, connections, realtime } =
				build();

			await service.handleWebhook(webhook());

			expect(conversations.ensure).toHaveBeenCalledWith(
				'u1',
				{ channel: 'WHATSAPP', contactKey: '5585988887777' },
				{
					accountKey: 'PN1',
					contact: {
						name: 'Ana',
						username: null,
						extra: { waId: '5585988887777' },
					},
				},
			);
			expect(messages.saveIncoming).toHaveBeenCalledWith(
				'u1',
				expect.objectContaining({ _id: 'c1' }),
				expect.objectContaining({
					channelMessageId: 'wamid.1',
					kind: 'TEXT',
					text: 'oi',
					sender: { id: '5585988887777', name: 'Ana', username: null },
					raw: expect.objectContaining({
						message: expect.objectContaining({ id: 'wamid.1' }),
					}),
				}),
			);
			expect(conversations.applyIncoming).toHaveBeenCalledWith(
				'u1',
				'c1',
				expect.objectContaining({
					accountKey: 'PN1',
					preview: expect.objectContaining({
						text: 'oi',
						kind: 'TEXT',
						direction: 'IN',
					}),
				}),
			);
			expect(connections.touchLastUpdate).toHaveBeenCalled();
			expect(realtime.notifyInboxUpdated).toHaveBeenCalledWith(
				'u1',
				AppsEnum.App.WHATSAPP,
				'5585988887777',
			);
		});

		it('keeps a file by its WhatsApp id', async () => {
			const { service, messages } = build();
			const body: any = webhook();
			body.entry[0].changes[0].value.messages[0] = {
				from: '5585988887777',
				id: 'wamid.2',
				timestamp: '1760000000',
				type: 'image',
				image: { id: 'M1', mime_type: 'image/jpeg', caption: 'olha' },
			};

			await service.handleWebhook(body);

			expect(messages.saveIncoming.mock.calls[0][2]).toMatchObject({
				kind: 'IMAGE',
				text: 'olha',
				attachments: [
					{
						mimeType: 'image/jpeg',
						source: { type: 'WHATSAPP_MEDIA', mediaId: 'M1' },
					},
				],
			});
		});

		it('ignores a message already stored, a number nobody connected and a user without the app', async () => {
			const stored = build();
			stored.messages.saveIncoming.mockResolvedValue(false);
			await stored.service.handleWebhook(webhook());
			expect(stored.conversations.applyIncoming).not.toHaveBeenCalled();

			const unknown = build();
			unknown.connections.findByPhoneNumberId.mockResolvedValue(null);
			await unknown.service.handleWebhook(webhook());
			expect(unknown.messages.saveIncoming).not.toHaveBeenCalled();

			const disabled = build({ enabledApps: [] });
			await disabled.service.handleWebhook(webhook());
			expect(disabled.conversations.ensure).not.toHaveBeenCalled();
		});

		it('lets a storage failure through, so Meta delivers again', async () => {
			const { service, messages } = build();
			messages.saveIncoming.mockRejectedValue(new Error('db down'));

			await expect(service.handleWebhook(webhook())).rejects.toThrow('db down');
		});

		it('does nothing for what is not a message', async () => {
			const { service, connections } = build();

			await service.handleWebhook({ object: 'page' });
			await service.handleWebhook(
				webhook({ messages: undefined, statuses: [{ id: 'x' }] }),
			);

			expect(connections.findByPhoneNumberId).not.toHaveBeenCalled();
		});
	});

	describe('sendText', () => {
		it('sends through the number, then keeps the message and moves the preview', async () => {
			const { service, graph, messages, conversations, realtime } = build();

			const result = await service.sendText(ctx, '5585988887777', 'claro!');

			expect(graph.sendText).toHaveBeenCalledWith(
				'TOKEN',
				'PN1',
				'5585988887777',
				'claro!',
			);
			expect(messages.saveOutgoing).toHaveBeenCalledWith(
				'u1',
				expect.objectContaining({ _id: 'c1' }),
				expect.objectContaining({
					channelMessageId: 'wamid.out1',
					kind: 'TEXT',
					text: 'claro!',
					sentByEmployeeId: 'e1',
				}),
			);
			expect(conversations.applyOutgoing).toHaveBeenCalledWith(
				'u1',
				'c1',
				expect.objectContaining({ text: 'claro!', direction: 'OUT' }),
			);
			expect(realtime.notifyInboxUpdated).toHaveBeenCalled();
			expect(result).toEqual({ _id: 'out1' });
		});

		it('records nothing when WhatsApp refuses', async () => {
			const { service, graph, messages } = build();
			graph.sendText.mockRejectedValue(new WhatsappApiError(500, null, 'boom'));

			await expect(
				service.sendText(ctx, '5585988887777', 'oi'),
			).rejects.toBeInstanceOf(WhatsappApiError);
			expect(messages.saveOutgoing).not.toHaveBeenCalled();
		});

		it('refuses without a number, a revoked number, an unknown person and a closed window, asking Meta for nothing', async () => {
			const none = build({ connection: null });
			await expect(
				none.service.sendText(ctx, 'x', 'oi'),
			).rejects.toBeInstanceOf(WhatsappNotConnectedException);

			const revoked = build({
				connection: connection({ status: AppsEnum.ConnectionStatus.REVOKED }),
			});
			await expect(
				revoked.service.sendText(ctx, 'x', 'oi'),
			).rejects.toBeInstanceOf(WhatsappConnectionRevokedException);

			const unknown = build({ conversation: null });
			await expect(
				unknown.service.sendText(ctx, 'x', 'oi'),
			).rejects.toBeInstanceOf(WhatsappChatNotFoundException);

			const closed = build({
				conversation: conversation({
					lastIncomingAt: new Date(Date.now() - 48 * HOUR),
				}),
			});
			await expect(
				closed.service.sendText(ctx, 'x', 'oi'),
			).rejects.toBeInstanceOf(WhatsappReplyWindowClosedException);

			for (const refused of [none, revoked, unknown, closed]) {
				expect(refused.graph.sendText).not.toHaveBeenCalled();
			}
		});

		it('tells apart the refusals Meta makes: outside the window, undeliverable, token no longer valid (the connection is marked revoked)', async () => {
			const window = build();
			window.graph.sendText.mockRejectedValue(
				new WhatsappApiError(400, 131047, 'outside'),
			);
			await expect(
				window.service.sendText(ctx, 'x', 'oi'),
			).rejects.toBeInstanceOf(WhatsappReplyWindowClosedException);

			const undeliverable = build();
			undeliverable.graph.sendText.mockRejectedValue(
				new WhatsappApiError(400, 131026, 'not on whatsapp'),
			);
			await expect(
				undeliverable.service.sendText(ctx, 'x', 'oi'),
			).rejects.toBeInstanceOf(WhatsappChatUnavailableException);

			const token = build();
			token.graph.sendText.mockRejectedValue(
				new WhatsappApiError(401, 190, 'expired'),
			);
			await expect(
				token.service.sendText(ctx, 'x', 'oi'),
			).rejects.toBeInstanceOf(WhatsappConnectionRevokedException);
			expect(token.connections.markRevoked).toHaveBeenCalledWith('cn1');
		});
	});

	describe('sendMedia', () => {
		const file = {
			buffer: Buffer.alloc(3),
			fileName: 'a.jpg',
			mimeType: 'image/jpeg',
		};

		it('sends the file with its caption and keeps it by its WhatsApp id', async () => {
			const { service, graph, messages } = build();

			await service.sendMedia(ctx, '5585988887777', file, 'olha');

			expect(graph.sendMedia).toHaveBeenCalledWith(
				'TOKEN',
				'PN1',
				'5585988887777',
				file,
				'olha',
			);
			expect(messages.saveOutgoing.mock.calls[0][2]).toMatchObject({
				channelMessageId: 'wamid.out2',
				kind: 'IMAGE',
				text: 'olha',
				attachments: [
					{
						mimeType: 'image/jpeg',
						fileName: 'a.jpg',
						size: 3,
						source: { type: 'WHATSAPP_MEDIA', mediaId: 'MID1' },
					},
				],
			});
		});

		it('sends the text of an audio as a message of its own, since audio has no caption', async () => {
			const { service, graph, messages } = build();
			graph.sendMedia.mockResolvedValue({
				mid: 'wamid.out3',
				sentAt: new Date('2030-01-02'),
				mediaId: 'MID2',
				type: 'audio',
			});

			await service.sendMedia(
				ctx,
				'5585988887777',
				{
					buffer: Buffer.alloc(1),
					fileName: 'voice.mp3',
					mimeType: 'audio/mpeg',
				},
				'ouve isso',
				true,
			);

			expect(messages.saveOutgoing.mock.calls[0][2]).toMatchObject({
				kind: 'VOICE',
				text: null,
			});
			expect(graph.sendText).toHaveBeenCalledWith(
				'TOKEN',
				'PN1',
				'5585988887777',
				'ouve isso',
			);
		});

		it('refuses when the window is closed, sending nothing', async () => {
			const closed = build({
				conversation: conversation({ lastIncomingAt: new Date(0) }),
			});

			await expect(
				closed.service.sendMedia(ctx, 'x', file, null),
			).rejects.toBeInstanceOf(WhatsappReplyWindowClosedException);
			expect(closed.graph.sendMedia).not.toHaveBeenCalled();
		});
	});

	describe('getAttachment', () => {
		const message: any = {
			attachments: [
				{
					mimeType: 'image/png',
					fileName: 'a.png',
					source: { type: 'WHATSAPP_MEDIA', mediaId: 'M1' },
				},
			],
		};

		it('asks WhatsApp for the address, then for the bytes, with the token of the owner', async () => {
			const { service, graph } = build();

			const file = await service.getAttachment('u1', message, 0);

			expect(graph.getMedia).toHaveBeenCalledWith('TOKEN', 'M1');
			expect(graph.downloadMedia).toHaveBeenCalledWith(
				'TOKEN',
				'https://lookaside.fbsbx.com/x',
			);
			expect(file).toMatchObject({
				contentType: 'image/jpeg',
				fileName: 'a.png',
			});
		});

		it('refuses a file the message does not have, and a user without a number', async () => {
			const { service } = build();
			await expect(
				service.getAttachment('u1', message, 3),
			).rejects.toBeInstanceOf(WhatsappAttachmentNotFoundException);
			await expect(
				service.getAttachment(
					'u1',
					{ attachments: [{ source: { type: 'URL', url: 'x' } }] } as any,
					0,
				),
			).rejects.toBeInstanceOf(WhatsappAttachmentNotFoundException);

			const none = build({ connection: null });
			await expect(
				none.service.getAttachment('u1', message, 0),
			).rejects.toBeInstanceOf(WhatsappNotConnectedException);
		});
	});
});
