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
		sendText: jest
			.fn()
			.mockResolvedValue({ mid: 'mid.9', sentAt: new Date('2030-01-02') }),
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
		registerOutgoing: jest.fn().mockResolvedValue(undefined),
		setProfile: jest.fn().mockResolvedValue(undefined),
		markRead: jest.fn().mockResolvedValue(undefined),
		setCustomer: jest.fn().mockResolvedValue(undefined),
		list: jest.fn().mockResolvedValue([]),
		findByPsid: jest.fn().mockResolvedValue(opts.chat ?? null),
	};
	const messages: any = {
		saveIncoming: jest.fn().mockResolvedValue(true),
		saveOutgoing: jest.fn().mockResolvedValue({ _id: 'out1' }),
		listByChat: jest.fn().mockResolvedValue([{ _id: 'm1' }]),
		findOwned: jest.fn().mockResolvedValue(null),
	};
	const customers: any = {
		findByPsid: jest.fn().mockResolvedValue(null),
		findNames: jest.fn().mockResolvedValue([]),
		findOwned: jest.fn().mockResolvedValue({ _id: 'cu1', name: 'Ana Cliente' }),
		createFromChat: jest
			.fn()
			.mockResolvedValue({ _id: 'cu9', name: 'Ana Souza' }),
		linkMessengerSource: jest.fn().mockResolvedValue(true),
		unlinkMessengerSource: jest.fn().mockResolvedValue(undefined),
	};
	const featureLimits: any = {
		assertCanCreate: jest.fn().mockResolvedValue(undefined),
	};

	return {
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

		it('keeps the message even when the profile cannot be read', async () => {
			const { service, chats, graph, messages } = build();
			chats.registerIncoming.mockResolvedValue(true);
			graph.getProfile.mockRejectedValue(new MetaApiError(400, 100, 'no'));

			await service.handleWebhook(webhookBody());

			expect(messages.saveIncoming).toHaveBeenCalled();
			expect(chats.setProfile).not.toHaveBeenCalled();
		});

		it('links a person who already is a customer, on their first message only', async () => {
			const first = build();
			first.chats.registerIncoming.mockResolvedValue(true);
			first.customers.findByPsid.mockResolvedValue({ _id: 'cu1', name: 'Ana' });

			await first.service.handleWebhook(webhookBody());

			expect(first.chats.setCustomer).toHaveBeenCalledWith(
				'u1',
				'PSID1',
				'cu1',
			);

			const later = build();
			later.chats.registerIncoming.mockResolvedValue(false);

			await later.service.handleWebhook(webhookBody());

			expect(later.customers.findByPsid).not.toHaveBeenCalled();
		});

		it('lets a storage failure through, so Facebook delivers again', async () => {
			const { service, messages } = build();
			messages.saveIncoming.mockRejectedValue(new Error('db down'));

			await expect(service.handleWebhook(webhookBody())).rejects.toThrow(
				'db down',
			);
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
			const { service, customers, chats } = build({ chat: freshChat() });

			const view = await service.linkCustomer('u1', 'PSID1', 'cu1');

			expect(customers.linkMessengerSource).toHaveBeenCalledWith(
				'u1',
				'cu1',
				'PSID1',
			);
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

			const taken = build({ chat: freshChat() });
			taken.customers.linkMessengerSource.mockResolvedValue(false);
			await expect(
				taken.service.linkCustomer('u1', 'PSID1', 'cu1'),
			).rejects.toBeInstanceOf(MessengerCustomerAlreadyLinkedException);
			expect(taken.chats.setCustomer).not.toHaveBeenCalled();

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

		it('createCustomerFromChat reuses the customer that person already is, spending no limit', async () => {
			const { service, featureLimits, customers } = build({
				chat: freshChat(),
			});
			customers.findByPsid.mockResolvedValue({ _id: 'cu5', name: 'Ana' });

			await service.createCustomerFromChat('u1', 'PSID1');

			expect(featureLimits.assertCanCreate).not.toHaveBeenCalled();
			expect(customers.createFromChat).not.toHaveBeenCalled();
		});

		it('unlinkCustomer cuts the link and keeps the customer', async () => {
			const { service, customers, chats } = build({
				chat: freshChat({ customerId: 'cu1' }),
			});

			const view = await service.unlinkCustomer('u1', 'PSID1');

			expect(customers.unlinkMessengerSource).toHaveBeenCalledWith('u1', 'cu1');
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
});
