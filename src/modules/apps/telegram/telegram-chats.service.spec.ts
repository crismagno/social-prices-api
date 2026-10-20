import InboxEnum from '../../inbox/interfaces/inbox.enum';
import TelegramEnum from './telegram.enum';
import { TelegramChatsService } from './telegram-chats.service';

const OWNER = '507f1f77bcf86cd799439011';
const TELEGRAM_KEY = { channel: InboxEnum.Channel.TELEGRAM, contactKey: '555' };

const message: any = {
	updateId: 100,
	messageId: 7,
	chatId: 555,
	fromUserId: 555,
	fromFirstName: 'Ana',
	fromLastName: 'Souza',
	fromUsername: 'ana_s',
	fromLanguageCode: 'pt-br',
	contentType: TelegramEnum.ContentType.TEXT,
	text: 'oi',
	sentAt: new Date('2030-01-01T10:00:00Z'),
};

const conversation = (over: any = {}): any => ({
	_id: 'c1',
	contactKey: '555',
	contact: { extra: { telegramUserId: 555 } },
	customerId: null,
	lastMessageAt: new Date('2030-01-01'),
	lastMessageText: 'oi',
	lastMessageChannelKind: 'TEXT',
	lastMessageDirection: 'IN',
	unreadCount: 0,
	...over,
});

const build = (found: any = conversation()) => {
	const conversations: any = {
		ensure: jest
			.fn()
			.mockResolvedValue({ conversation: conversation(), created: false }),
		applyIncoming: jest.fn().mockResolvedValue(false),
		applyOutgoing: jest.fn().mockResolvedValue(undefined),
		setPreview: jest.fn().mockResolvedValue(undefined),
		markRead: jest.fn().mockResolvedValue(undefined),
		setCustomer: jest.fn().mockResolvedValue(undefined),
		countUnread: jest.fn().mockResolvedValue(3),
		listByChannel: jest.fn().mockResolvedValue([conversation()]),
		findByKey: jest.fn().mockResolvedValue(found),
	};

	return { conversations, service: new TelegramChatsService(conversations) };
};

describe('TelegramChatsService (over the central inbox)', () => {
	describe('registerIncoming', () => {
		it('makes sure the conversation exists, then moves it with what the person said', async () => {
			const { service, conversations } = build();

			await service.registerIncoming(OWNER, message);

			expect(conversations.ensure).toHaveBeenCalledWith(OWNER, TELEGRAM_KEY, {
				contact: expect.objectContaining({
					username: 'ana_s',
					name: 'Ana Souza',
				}),
			});
			expect(conversations.applyIncoming).toHaveBeenCalledWith(OWNER, 'c1', {
				preview: {
					text: 'oi',
					kind: 'TEXT',
					channelKind: 'TEXT',
					direction: 'IN',
					at: message.sentAt,
				},
				contact: expect.objectContaining({
					extra: { telegramUserId: 555, firstName: 'Ana', lastName: 'Souza' },
				}),
			});
		});

		it('says whether it was the first message of that person', async () => {
			const { service, conversations } = build();

			conversations.applyIncoming.mockResolvedValue(true);
			await expect(service.registerIncoming(OWNER, message)).resolves.toBe(
				true,
			);

			conversations.applyIncoming.mockResolvedValue(false);
			await expect(service.registerIncoming(OWNER, message)).resolves.toBe(
				false,
			);
		});
	});

	it('registerOutgoing moves the preview, remembering the kind of a file', async () => {
		const { service, conversations } = build();
		const at = new Date('2030-01-02');

		await service.registerOutgoing(
			OWNER,
			555,
			null,
			at,
			TelegramEnum.ContentType.PHOTO,
		);

		expect(conversations.applyOutgoing).toHaveBeenCalledWith(OWNER, 'c1', {
			text: null,
			kind: 'IMAGE',
			channelKind: 'PHOTO',
			direction: 'OUT',
			at,
		});
	});

	it('setLastMessage points the inbox at the message that is now the newest', async () => {
		const { service, conversations } = build();
		const sentAt = new Date('2030-01-03');

		await service.setLastMessage(OWNER, 555, {
			text: 'oi',
			contentType: TelegramEnum.ContentType.TEXT,
			direction: TelegramEnum.Direction.IN,
			sentAt,
		} as any);

		expect(conversations.setPreview).toHaveBeenCalledWith(OWNER, 'c1', {
			text: 'oi',
			kind: 'TEXT',
			channelKind: 'TEXT',
			direction: 'IN',
			at: sentAt,
		});
	});

	it('markRead and setCustomer act on that conversation', async () => {
		const { service, conversations } = build();

		await service.markRead(OWNER, 555);
		await service.setCustomer(OWNER, 555, 'cu1');
		await service.setCustomer(OWNER, 555, null);

		expect(conversations.markRead).toHaveBeenCalledWith(OWNER, 'c1');
		expect(conversations.setCustomer).toHaveBeenNthCalledWith(
			1,
			OWNER,
			'c1',
			'cu1',
		);
		expect(conversations.setCustomer).toHaveBeenNthCalledWith(
			2,
			OWNER,
			'c1',
			null,
		);
	});

	it('does nothing for a chat that does not exist', async () => {
		const { service, conversations } = build(null);

		await service.markRead(OWNER, 999);
		await service.setCustomer(OWNER, 999, 'cu1');
		await service.registerOutgoing(OWNER, 999, 'x', new Date());
		await service.setLastMessage(OWNER, 999, {} as any);

		expect(conversations.markRead).not.toHaveBeenCalled();
		expect(conversations.setCustomer).not.toHaveBeenCalled();
		expect(conversations.applyOutgoing).not.toHaveBeenCalled();
		expect(conversations.setPreview).not.toHaveBeenCalled();
	});

	it('countUnread counts the Telegram conversations only', async () => {
		const { service, conversations } = build();

		await expect(service.countUnread(OWNER)).resolves.toBe(3);
		expect(conversations.countUnread).toHaveBeenCalledWith(OWNER, 'TELEGRAM');
	});

	it('list and findByChatId give the Telegram chat shape back', async () => {
		const { service, conversations } = build();

		const [chat] = await service.list(OWNER);

		expect(conversations.listByChannel).toHaveBeenCalledWith(OWNER, 'TELEGRAM');
		expect(chat).toMatchObject({ chatId: 555, telegramUserId: 555 });
		await expect(service.findByChatId(OWNER, 555)).resolves.toMatchObject({
			chatId: 555,
		});

		const none = build(null);
		await expect(none.service.findByChatId(OWNER, 1)).resolves.toBeNull();
	});
});
