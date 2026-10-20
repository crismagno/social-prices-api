import FeatureLimitsEnum from '../../feature-limits/interfaces/feature-limits.enum';
import AppsEnum from '../interfaces/apps.enum';
import {
	MessengerAttachmentNotFoundException,
	MessengerChatNotFoundException,
	MessengerChatUnavailableException,
	MessengerCustomerAlreadyLinkedException,
	MessengerCustomerNotFoundException,
	MessengerNotConnectedException,
	MessengerReplyWindowClosedException,
} from './messenger.exceptions';
import { MessengerService } from './messenger.service';
import { MetaApiError } from './messenger.types';

const CTX = { ownerUserId: 'u1', employeeId: 'e1' } as any;
const HOUR = 3_600_000;

const connection = {
	_id: 'c1',
	ownerUserId: 'u1',
	pageId: 'PAGE1',
	token: 'ENC',
};

const freshChat = (over: any = {}) => ({
	psid: 'PSID1',
	name: 'Ana',
	customerId: null,
	lastIncomingAt: new Date(Date.now() - HOUR),
	...over,
});

const build = (
	opts: { chat?: any; connection?: any; enabledApps?: any } = {},
) => {
	const graph: any = {
		sendAttachment: jest.fn().mockResolvedValue({
			mid: 'mid.8',
			sentAt: new Date('2030-01-02'),
			type: 'file',
		}),
		sendText: jest
			.fn()
			.mockResolvedValue({ mid: 'mid.9', sentAt: new Date('2030-01-02') }),
		getParticipantName: jest.fn().mockResolvedValue(null),
		getProfile: jest
			.fn()
			.mockResolvedValue({ name: 'Ana Souza', profilePic: 'https://x/p.jpg' }),
		fetchAttachment: jest.fn().mockResolvedValue({
			buffer: Buffer.from('x'),
			contentType: 'image/jpeg',
		}),
	};
	const connections: any = {
		findByPageId: jest
			.fn()
			.mockResolvedValue('connection' in opts ? opts.connection : connection),
		findWithToken: jest
			.fn()
			.mockResolvedValue('connection' in opts ? opts.connection : connection),
		readToken: jest.fn().mockReturnValue('PAGE_TOKEN'),
		touchLastUpdate: jest.fn().mockResolvedValue(undefined),
	};
	const users: any = {
		findOneById: jest.fn().mockResolvedValue({
			enabledApps: opts.enabledApps ?? [AppsEnum.App.FACEBOOK],
		}),
	};
	const chats: any = {
		registerIncoming: jest.fn().mockResolvedValue(false),
		registerEcho: jest.fn().mockResolvedValue(false),
		registerOutgoing: jest.fn().mockResolvedValue(undefined),
		setProfile: jest.fn().mockResolvedValue(undefined),
		markRead: jest.fn().mockResolvedValue(undefined),
		setCustomer: jest.fn().mockResolvedValue(undefined),
		list: jest.fn().mockResolvedValue([]),
		findByPsid: jest.fn().mockResolvedValue(opts.chat ?? null),
	};
	const messages: any = {
		saveIncoming: jest.fn().mockResolvedValue(true),
		saveEcho: jest.fn().mockResolvedValue(true),
		saveOutgoing: jest.fn().mockResolvedValue({ _id: 'out1' }),
		listByChat: jest.fn().mockResolvedValue([{ _id: 'm1' }]),
		findOwned: jest.fn().mockResolvedValue(null),
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
		realtime,
		graph,
		connections,
		chats,
		messages,
		customers,
		featureLimits,
		service: new MessengerService(
			graph,
			{} as any,
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
	object: 'page',
	entry: [
		{
			id: 'PAGE1',
			messaging: [
				{
					sender: { id: 'PSID1' },
					recipient: { id: 'PAGE1' },
					timestamp: 1_760_000_000_000,
					message: { mid: 'm1', text: 'oi', ...over },
				},
			],
		},
	],
});

describe('MessengerService inbox', () => {
	describe('handleWebhook', () => {
		it('stores the message for the owner of that Page and updates the inbox', async () => {
			const { service, messages, chats, connections } = build();

			await service.handleWebhook(webhookBody());

			expect(connections.findByPageId).toHaveBeenCalledWith('PAGE1');
			expect(messages.saveIncoming).toHaveBeenCalledWith(
				'u1',
				expect.objectContaining({ psid: 'PSID1', mid: 'm1', text: 'oi' }),
			);
			expect(chats.registerIncoming).toHaveBeenCalledWith(
				'u1',
				expect.objectContaining({ psid: 'PSID1' }),
			);
			expect(connections.touchLastUpdate).toHaveBeenCalledWith(
				'c1',
				expect.any(Date),
			);
		});

		it('does nothing more for a message it already had', async () => {
			const { service, messages, chats } = build();
			messages.saveIncoming.mockResolvedValue(false);

			await service.handleWebhook(webhookBody());

			expect(chats.registerIncoming).not.toHaveBeenCalled();
		});

		it('ignores a Page nobody connected, and a user without the app enabled', async () => {
			const unknown = build({ connection: null });
			await unknown.service.handleWebhook(webhookBody());
			expect(unknown.messages.saveIncoming).not.toHaveBeenCalled();

			const disabled = build({ enabledApps: [] });
			await disabled.service.handleWebhook(webhookBody());
			expect(disabled.messages.saveIncoming).not.toHaveBeenCalled();
		});

		it('learns the name and picture of a person on their first message', async () => {
			const { service, chats, graph } = build();
			chats.registerIncoming.mockResolvedValue(true);

			await service.handleWebhook(webhookBody());

			expect(graph.getProfile).toHaveBeenCalledWith('PAGE_TOKEN', 'PSID1');
			expect(chats.setProfile).toHaveBeenCalledWith('u1', 'PSID1', {
				name: 'Ana Souza',
				profilePic: 'https://x/p.jpg',
			});
		});

		it('keeps the message even when no name can be found', async () => {
			const { service, chats, graph, messages } = build();
			chats.registerIncoming.mockResolvedValue(true);
			graph.getProfile.mockRejectedValue(new MetaApiError(400, 100, 'no'));
			graph.getParticipantName.mockResolvedValue(null);

			await service.handleWebhook(webhookBody());

			expect(messages.saveIncoming).toHaveBeenCalled();
			expect(chats.setProfile).not.toHaveBeenCalled();
		});

		it("takes the name from the conversation when Facebook refuses the person's profile", async () => {
			const { service, chats, graph } = build();
			chats.registerIncoming.mockResolvedValue(true);
			graph.getProfile.mockRejectedValue(
				new MetaApiError(400, 100, 'missing permissions'),
			);
			graph.getParticipantName.mockResolvedValue('Cristhofer Magno');

			await service.handleWebhook(webhookBody());

			expect(graph.getParticipantName).toHaveBeenCalledWith(
				'PAGE_TOKEN',
				'PAGE1',
				'PSID1',
			);
			expect(chats.setProfile).toHaveBeenCalledWith('u1', 'PSID1', {
				name: 'Cristhofer Magno',
				profilePic: null,
			});
		});

		it('does not look further when the profile already had the name', async () => {
			const { service, chats, graph } = build();
			chats.registerIncoming.mockResolvedValue(true);

			await service.handleWebhook(webhookBody());

			expect(chats.setProfile).toHaveBeenCalled();
			expect(graph.getParticipantName).not.toHaveBeenCalled();
		});

		it('tries again to learn the name on a later message when the conversation still has none', async () => {
			const { service, chats, graph } = build({
				chat: { psid: 'PSID1', name: null },
			});
			chats.registerIncoming.mockResolvedValue(false);

			await service.handleWebhook(webhookBody());

			expect(graph.getProfile).toHaveBeenCalledWith('PAGE_TOKEN', 'PSID1');
			expect(chats.setProfile).toHaveBeenCalled();
		});

		it('does not ask again once the conversation has a name', async () => {
			const { service, chats, graph } = build({
				chat: { psid: 'PSID1', name: 'Ana Souza' },
			});
			chats.registerIncoming.mockResolvedValue(false);

			await service.handleWebhook(webhookBody());

			expect(graph.getProfile).not.toHaveBeenCalled();
		});

		it('lets a storage failure through, so Facebook delivers again', async () => {
			const { service, messages } = build();
			messages.saveIncoming.mockRejectedValue(new Error('db down'));

			await expect(service.handleWebhook(webhookBody())).rejects.toThrow(
				'db down',
			);
		});

		describe('echoes: what the Page sent from Messenger or Business Suite', () => {
			const echoBody = () => ({
				object: 'page',
				entry: [
					{
						id: 'PAGE1',
						messaging: [
							{
								sender: { id: 'PAGE1' },
								recipient: { id: 'PSID1' },
								timestamp: 1_760_000_000_000,
								message: {
									mid: 'e1',
									text: 'pelo Business Suite',
									is_echo: true,
								},
							},
						],
					},
				],
			});

			it('keeps it as a message the Page sent, in the conversation of the person it went to', async () => {
				const { service, messages, chats, connections } = build();

				await service.handleWebhook(echoBody());

				expect(messages.saveEcho).toHaveBeenCalledWith(
					'u1',
					expect.objectContaining({
						psid: 'PSID1',
						mid: 'e1',
						text: 'pelo Business Suite',
					}),
				);
				expect(messages.saveIncoming).not.toHaveBeenCalled();
				expect(chats.registerEcho).toHaveBeenCalledWith(
					'u1',
					expect.objectContaining({ psid: 'PSID1' }),
				);
				expect(chats.registerIncoming).not.toHaveBeenCalled();
				expect(connections.touchLastUpdate).not.toHaveBeenCalled();
			});

			it('does nothing more for an echo it already had, such as one of a message sent from here', async () => {
				const { service, messages, chats } = build();
				messages.saveEcho.mockResolvedValue(false);

				await service.handleWebhook(echoBody());

				expect(chats.registerEcho).not.toHaveBeenCalled();
			});

			it('learns who the person is when the Page wrote to them first', async () => {
				const { service, chats, graph } = build();
				chats.registerEcho.mockResolvedValue(true);

				await service.handleWebhook(echoBody());

				expect(graph.getProfile).toHaveBeenCalledWith('PAGE_TOKEN', 'PSID1');
				expect(chats.setProfile).toHaveBeenCalled();
			});

			it('ignores the echo of a Page nobody connected, and of a user without the app', async () => {
				const unknown = build({ connection: null });
				await unknown.service.handleWebhook(echoBody());
				expect(unknown.messages.saveEcho).not.toHaveBeenCalled();

				const disabled = build({ enabledApps: [] });
				await disabled.service.handleWebhook(echoBody());
				expect(disabled.messages.saveEcho).not.toHaveBeenCalled();
			});
		});

		it('ignores a body that is not a customer message', async () => {
			const { service, messages } = build();

			await service.handleWebhook({ object: 'page', entry: [] });
			await service.handleWebhook(null as any);

			expect(messages.saveIncoming).not.toHaveBeenCalled();
		});
	});

	describe('listChats', () => {
		it('shows the customer name and whether the 24 hour window is still open', async () => {
			const { service, chats, customers } = build();
			chats.list.mockResolvedValue([
				freshChat({ customerId: 'cu1' }),
				freshChat({
					psid: 'PSID2',
					lastIncomingAt: new Date(Date.now() - 25 * HOUR),
				}),
			]);
			customers.findNames.mockResolvedValue([
				{ _id: 'cu1', name: 'Ana Cliente' },
			]);

			const views = await service.listChats('u1');

			expect(views[0]).toMatchObject({
				psid: 'PSID1',
				customerName: 'Ana Cliente',
				canReply: true,
			});
			expect(views[1]).toMatchObject({ psid: 'PSID2', canReply: false });
			expect(views[0].replyWindowEndsAt.getTime()).toBeGreaterThan(Date.now());
		});
	});

	describe('sendMessage', () => {
		it('answers through the Page, then keeps the message and updates the inbox', async () => {
			const { service, graph, messages, chats } = build({ chat: freshChat() });

			await service.sendMessage(CTX, 'PSID1', 'claro!');

			expect(graph.sendText).toHaveBeenCalledWith(
				'PAGE_TOKEN',
				'PSID1',
				'claro!',
			);
			expect(messages.saveOutgoing).toHaveBeenCalledWith('u1', {
				psid: 'PSID1',
				mid: 'mid.9',
				text: 'claro!',
				sentAt: new Date('2030-01-02'),
				sentByEmployeeId: 'e1',
			});
			expect(chats.registerOutgoing).toHaveBeenCalledWith(
				'u1',
				'PSID1',
				'claro!',
				new Date('2030-01-02'),
			);
		});

		it('refuses, sending nothing, when more than 24 hours passed', async () => {
			const { service, graph } = build({
				chat: freshChat({ lastIncomingAt: new Date(Date.now() - 25 * HOUR) }),
			});

			await expect(
				service.sendMessage(CTX, 'PSID1', 'oi'),
			).rejects.toBeInstanceOf(MessengerReplyWindowClosedException);
			expect(graph.sendText).not.toHaveBeenCalled();
		});

		it("refuses when no Page is connected, and for a conversation that is not this user's", async () => {
			await expect(
				build({ chat: freshChat(), connection: null }).service.sendMessage(
					CTX,
					'PSID1',
					'oi',
				),
			).rejects.toBeInstanceOf(MessengerNotConnectedException);

			await expect(
				build({ chat: null }).service.sendMessage(CTX, 'PSID9', 'oi'),
			).rejects.toBeInstanceOf(MessengerChatNotFoundException);
		});

		it('explains when Facebook says the window closed or the person is unreachable, keeping nothing', async () => {
			const closed = build({ chat: freshChat() });
			closed.graph.sendText.mockRejectedValue(
				new MetaApiError(400, 10, 'outside window'),
			);
			await expect(
				closed.service.sendMessage(CTX, 'PSID1', 'oi'),
			).rejects.toBeInstanceOf(MessengerReplyWindowClosedException);
			expect(closed.messages.saveOutgoing).not.toHaveBeenCalled();

			const blocked = build({ chat: freshChat() });
			blocked.graph.sendText.mockRejectedValue(
				new MetaApiError(400, 551, 'unavailable'),
			);
			const error = await blocked.service
				.sendMessage(CTX, 'PSID1', 'oi')
				.catch((e) => e);
			expect(error).toBeInstanceOf(MessengerChatUnavailableException);
			expect(blocked.messages.saveOutgoing).not.toHaveBeenCalled();
		});

		it('lets other failures through, such as Facebook being unreachable', async () => {
			const { service, graph } = build({ chat: freshChat() });
			graph.sendText.mockRejectedValue(new MetaApiError(0, null, 'down'));

			await expect(
				service.sendMessage(CTX, 'PSID1', 'oi'),
			).rejects.toBeInstanceOf(MetaApiError);
		});
	});

	describe('sendAttachment', () => {
		const file = {
			buffer: Buffer.alloc(2048),
			fileName: 'orcamento.pdf',
			mimeType: 'application/pdf',
		};

		it('uploads through the Page, then keeps the message with what is known of the file', async () => {
			const { service, graph, messages, chats } = build({ chat: freshChat() });

			await service.sendAttachment(CTX, 'PSID1', file);

			expect(graph.sendAttachment).toHaveBeenCalledWith(
				'PAGE_TOKEN',
				'PSID1',
				file,
			);
			expect(messages.saveOutgoing).toHaveBeenCalledWith('u1', {
				psid: 'PSID1',
				mid: 'mid.8',
				text: null,
				localAttachment: {
					type: 'file',
					fileName: 'orcamento.pdf',
					size: 2048,
				},
				sentAt: new Date('2030-01-02'),
				sentByEmployeeId: 'e1',
			});
			expect(chats.registerOutgoing).toHaveBeenCalledWith(
				'u1',
				'PSID1',
				null,
				new Date('2030-01-02'),
				'file',
			);
		});

		it("refuses, uploading nothing, when no Page is connected, the conversation is not this user's or the window closed", async () => {
			const none = build({ chat: freshChat(), connection: null });
			await expect(
				none.service.sendAttachment(CTX, 'PSID1', file),
			).rejects.toBeInstanceOf(MessengerNotConnectedException);

			const foreign = build({ chat: null });
			await expect(
				foreign.service.sendAttachment(CTX, 'PSID9', file),
			).rejects.toBeInstanceOf(MessengerChatNotFoundException);

			const closed = build({
				chat: freshChat({ lastIncomingAt: new Date(Date.now() - 25 * HOUR) }),
			});
			await expect(
				closed.service.sendAttachment(CTX, 'PSID1', file),
			).rejects.toBeInstanceOf(MessengerReplyWindowClosedException);
			expect(closed.graph.sendAttachment).not.toHaveBeenCalled();
		});

		it('explains when Facebook refuses the window or the person, keeping nothing', async () => {
			const closed = build({ chat: freshChat() });
			closed.graph.sendAttachment.mockRejectedValue(
				new MetaApiError(400, 10, 'outside window'),
			);
			await expect(
				closed.service.sendAttachment(CTX, 'PSID1', file),
			).rejects.toBeInstanceOf(MessengerReplyWindowClosedException);
			expect(closed.messages.saveOutgoing).not.toHaveBeenCalled();

			const blocked = build({ chat: freshChat() });
			blocked.graph.sendAttachment.mockRejectedValue(
				new MetaApiError(400, 551, 'unavailable'),
			);
			await expect(
				blocked.service.sendAttachment(CTX, 'PSID1', file),
			).rejects.toBeInstanceOf(MessengerChatUnavailableException);
		});

		it('lets other failures through, such as a file Facebook does not accept', async () => {
			const { service, graph } = build({ chat: freshChat() });
			graph.sendAttachment.mockRejectedValue(
				new MetaApiError(400, 100, 'bad file'),
			);

			await expect(
				service.sendAttachment(CTX, 'PSID1', file),
			).rejects.toBeInstanceOf(MetaApiError);
		});
	});

	describe('conversation', () => {
		it('getChatMessages and markRead only for a conversation of this user', async () => {
			const { service, messages, chats } = build({ chat: freshChat() });

			await service.getChatMessages('u1', 'PSID1', { limit: 10 });
			await service.markRead('u1', 'PSID1');

			expect(messages.listByChat).toHaveBeenCalledWith('u1', 'PSID1', {
				limit: 10,
			});
			expect(chats.markRead).toHaveBeenCalledWith('u1', 'PSID1');

			const none = build({ chat: null });
			await expect(
				none.service.getChatMessages('u1', 'x', {}),
			).rejects.toBeInstanceOf(MessengerChatNotFoundException);
			await expect(none.service.markRead('u1', 'x')).rejects.toBeInstanceOf(
				MessengerChatNotFoundException,
			);
		});
	});

	describe('customer link', () => {
		it("linkCustomer ties the person to one of the user's customers", async () => {
			const { service, chats } = build({ chat: freshChat() });

			const view = await service.linkCustomer('u1', 'PSID1', 'cu1');

			expect(chats.setCustomer).toHaveBeenCalledWith('u1', 'PSID1', 'cu1');
			expect(view).toMatchObject({
				customerId: 'cu1',
				customerName: 'Ana Cliente',
			});
		});

		it("linkCustomer refuses a customer that is not this user's, one already linked, and a chat already linked", async () => {
			const foreign = build({ chat: freshChat() });
			foreign.customers.findOwned.mockResolvedValue(null);
			await expect(
				foreign.service.linkCustomer('u1', 'PSID1', 'x'),
			).rejects.toBeInstanceOf(MessengerCustomerNotFoundException);

			const linked = build({ chat: freshChat({ customerId: 'cu0' }) });
			await expect(
				linked.service.linkCustomer('u1', 'PSID1', 'cu1'),
			).rejects.toBeInstanceOf(MessengerCustomerAlreadyLinkedException);
		});

		it('createCustomerFromChat checks the plan limit, then makes and links the customer', async () => {
			const { service, featureLimits, customers, chats } = build({
				chat: freshChat(),
			});

			const view = await service.createCustomerFromChat('u1', 'PSID1');

			expect(featureLimits.assertCanCreate).toHaveBeenCalledWith(
				'u1',
				FeatureLimitsEnum.Feature.CUSTOMERS,
			);
			expect(customers.createFromChat).toHaveBeenCalled();
			expect(chats.setCustomer).toHaveBeenCalledWith('u1', 'PSID1', 'cu9');
			expect(view.customerId).toBe('cu9');
		});

		it('unlinkCustomer cuts the link and keeps the customer', async () => {
			const { service, chats } = build({
				chat: freshChat({ customerId: 'cu1' }),
			});

			const view = await service.unlinkCustomer('u1', 'PSID1');

			expect(chats.setCustomer).toHaveBeenCalledWith('u1', 'PSID1', null);
			expect(view.customerId).toBeNull();
		});
	});

	describe('getAttachment', () => {
		const record = {
			attachments: [
				{ type: 'image', url: 'https://scontent.xx.fbcdn.net/a.jpg' },
				{ type: 'file', url: 'https://cdn.fbsbx.com/b.pdf' },
			],
		};

		it('fetches the file of one message from Facebook, for this user only', async () => {
			const { service, graph, messages } = build({ chat: freshChat() });
			messages.findOwned.mockResolvedValue(record);

			const result = await service.getAttachment('u1', 'PSID1', 'm1', 1);

			expect(messages.findOwned).toHaveBeenCalledWith('u1', 'PSID1', 'm1');
			expect(graph.fetchAttachment).toHaveBeenCalledWith(
				'https://cdn.fbsbx.com/b.pdf',
			);
			expect(result).toMatchObject({ contentType: 'image/jpeg' });
		});

		it("does not know a message that is not this user's, or a file it does not have", async () => {
			const none = build({ chat: freshChat() });
			await expect(
				none.service.getAttachment('u1', 'PSID1', 'm1', 0),
			).rejects.toBeInstanceOf(MessengerAttachmentNotFoundException);

			const { service, messages, graph } = build({ chat: freshChat() });
			messages.findOwned.mockResolvedValue(record);
			await expect(
				service.getAttachment('u1', 'PSID1', 'm1', 5),
			).rejects.toBeInstanceOf(MessengerAttachmentNotFoundException);
			expect(graph.fetchAttachment).not.toHaveBeenCalled();
		});
	});

	describe('real time: the open pages of the account hear about every change', () => {
		const told = (r: any, psid = 'PSID1') =>
			expect(r.notifyInboxUpdated).toHaveBeenCalledWith(
				'u1',
				AppsEnum.App.FACEBOOK,
				psid,
			);

		it('a message that arrived, and an echo of what the Page sent elsewhere', async () => {
			const incoming = build();
			await incoming.service.handleWebhook(webhookBody());
			told(incoming.realtime);

			const echo = build();
			await echo.service.handleWebhook({
				object: 'page',
				entry: [
					{
						id: 'PAGE1',
						messaging: [
							{
								sender: { id: 'PAGE1' },
								recipient: { id: 'PSID1' },
								timestamp: 1_760_000_000_000,
								message: {
									mid: 'e1',
									text: 'pelo Business Suite',
									is_echo: true,
								},
							},
						],
					},
				],
			});
			told(echo.realtime);
		});

		it('says nothing for a message it already had, or ignored', async () => {
			const duplicate = build();
			duplicate.messages.saveIncoming.mockResolvedValue(false);
			await duplicate.service.handleWebhook(webhookBody());
			expect(duplicate.realtime.notifyInboxUpdated).not.toHaveBeenCalled();

			const unknown = build({ connection: null });
			await unknown.service.handleWebhook(webhookBody());
			expect(unknown.realtime.notifyInboxUpdated).not.toHaveBeenCalled();
		});

		it('a reply, a file, and a conversation that was read', async () => {
			const reply = build({ chat: freshChat() });
			await reply.service.sendMessage(CTX, 'PSID1', 'oi');
			told(reply.realtime);

			const file = build({ chat: freshChat() });
			await file.service.sendAttachment(CTX, 'PSID1', {
				buffer: Buffer.alloc(4),
				fileName: 'a.pdf',
				mimeType: 'application/pdf',
			});
			told(file.realtime);

			const read = build({ chat: freshChat() });
			await read.service.markRead('u1', 'PSID1');
			told(read.realtime);
		});

		it('tells nothing when the send was refused', async () => {
			const { service, graph, realtime } = build({ chat: freshChat() });
			graph.sendText.mockRejectedValue(new MetaApiError(0, null, 'down'));

			await service.sendMessage(CTX, 'PSID1', 'oi').catch(() => undefined);

			expect(realtime.notifyInboxUpdated).not.toHaveBeenCalled();
		});
	});
});
