import { MessengerChatsService } from './messenger-chats.service';

const OWNER = '507f1f77bcf86cd799439011';
const KEY = { channel: 'MESSENGER', contactKey: 'PSID1' };

const message = (over: any = {}): any => ({
	pageId: 'PAGE1',
	psid: 'PSID1',
	direction: 'IN',
	mid: 'm1',
	text: 'oi',
	attachments: [],
	sentAt: new Date('2030-01-01T10:00:00Z'),
	...over,
});

const conversation = (over: any = {}): any => ({
	_id: 'c1',
	contactKey: 'PSID1',
	accountKey: 'PAGE1',
	contact: { name: 'Ana', profilePic: 'pic' },
	customerId: null,
	lastMessageAt: new Date('2030-01-01'),
	lastMessageText: 'oi',
	lastMessageChannelKind: null,
	lastMessageDirection: 'IN',
	lastIncomingAt: new Date('2030-01-01'),
	unreadCount: 2,
	...over,
});

const build = (found: any = conversation(), ensured: any = conversation()) => {
	const conversations: any = {
		ensure: jest
			.fn()
			.mockResolvedValue({ conversation: ensured, created: false }),
		applyIncoming: jest.fn().mockResolvedValue(false),
		applyEcho: jest.fn().mockResolvedValue(undefined),
		applyOutgoing: jest.fn().mockResolvedValue(undefined),
		setContact: jest.fn().mockResolvedValue(undefined),
		markRead: jest.fn().mockResolvedValue(undefined),
		setCustomer: jest.fn().mockResolvedValue(undefined),
		countUnread: jest.fn().mockResolvedValue(4),
		listByChannel: jest.fn().mockResolvedValue([conversation()]),
		findByKey: jest.fn().mockResolvedValue(found),
	};

	return { conversations, service: new MessengerChatsService(conversations) };
};

describe('MessengerChatsService (over the central inbox)', () => {
	describe('registerIncoming', () => {
		it('opens the conversation on the Page and moves it with what the person said', async () => {
			const { service, conversations } = build();

			await service.registerIncoming(OWNER, message());

			expect(conversations.ensure).toHaveBeenCalledWith(OWNER, KEY, {
				accountKey: 'PAGE1',
			});
			expect(conversations.applyIncoming).toHaveBeenCalledWith(OWNER, 'c1', {
				accountKey: 'PAGE1',
				preview: {
					text: 'oi',
					kind: 'TEXT',
					channelKind: null,
					direction: 'IN',
					at: message().sentAt,
				},
			});
		});

		it('says whether it was the first message of that person', async () => {
			const { service, conversations } = build();

			conversations.applyIncoming.mockResolvedValue(true);
			await expect(service.registerIncoming(OWNER, message())).resolves.toBe(
				true,
			);

			conversations.applyIncoming.mockResolvedValue(false);
			await expect(service.registerIncoming(OWNER, message())).resolves.toBe(
				false,
			);
		});

		it('previews a file by its kind when there is no text, and cuts long text', async () => {
			const { service, conversations } = build();

			await service.registerIncoming(
				OWNER,
				message({
					text: null,
					attachments: [{ type: 'image', url: 'https://x/a.jpg' }],
				}),
			);
			expect(
				conversations.applyIncoming.mock.calls[0][2].preview,
			).toMatchObject({
				text: null,
				kind: 'IMAGE',
				channelKind: 'image',
			});

			await service.registerIncoming(OWNER, message({ text: 'a'.repeat(300) }));
			expect(
				conversations.applyIncoming.mock.calls[1][2].preview.text,
			).toHaveLength(120);
		});
	});

	describe('registerEcho', () => {
		it('only moves the preview, leaving unread and the window alone', async () => {
			const { service, conversations } = build();

			await service.registerEcho(OWNER, message({ direction: 'OUT' }));

			expect(conversations.applyEcho).toHaveBeenCalledWith(
				OWNER,
				'c1',
				expect.objectContaining({ direction: 'OUT', text: 'oi' }),
			);
			expect(conversations.applyIncoming).not.toHaveBeenCalled();
		});

		it('says true only for a conversation that had no message yet', async () => {
			const fresh = build(null, conversation({ lastMessageAt: null }));
			await expect(
				fresh.service.registerEcho(OWNER, message({ direction: 'OUT' })),
			).resolves.toBe(true);

			const existing = build();
			await expect(
				existing.service.registerEcho(OWNER, message({ direction: 'OUT' })),
			).resolves.toBe(false);
		});
	});

	it('registerOutgoing moves the preview, remembering the kind of a file', async () => {
		const { service, conversations } = build();
		const at = new Date('2030-01-02');

		await service.registerOutgoing(OWNER, 'PSID1', null, at, 'audio');

		expect(conversations.applyOutgoing).toHaveBeenCalledWith(OWNER, 'c1', {
			text: null,
			kind: 'AUDIO',
			channelKind: 'audio',
			direction: 'OUT',
			at,
		});
	});

	it('setProfile keeps the name and picture Facebook gave', async () => {
		const { service, conversations } = build();

		await service.setProfile(OWNER, 'PSID1', { name: 'Ana', profilePic: 'p' });

		expect(conversations.setContact).toHaveBeenCalledWith(OWNER, 'c1', {
			name: 'Ana',
			profilePic: 'p',
		});
	});

	it('markRead and setCustomer act on that conversation', async () => {
		const { service, conversations } = build();

		await service.markRead(OWNER, 'PSID1');
		await service.setCustomer(OWNER, 'PSID1', 'cu1');
		await service.setCustomer(OWNER, 'PSID1', null);

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

	it('does nothing for a person who has no conversation', async () => {
		const { service, conversations } = build(null);

		await service.markRead(OWNER, 'X');
		await service.setCustomer(OWNER, 'X', 'cu1');
		await service.setProfile(OWNER, 'X', { name: 'A', profilePic: null });
		await service.registerOutgoing(OWNER, 'X', 'a', new Date());

		expect(conversations.markRead).not.toHaveBeenCalled();
		expect(conversations.setCustomer).not.toHaveBeenCalled();
		expect(conversations.setContact).not.toHaveBeenCalled();
		expect(conversations.applyOutgoing).not.toHaveBeenCalled();
	});

	it('countUnread counts the Messenger conversations only', async () => {
		const { service, conversations } = build();

		await expect(service.countUnread(OWNER)).resolves.toBe(4);
		expect(conversations.countUnread).toHaveBeenCalledWith(OWNER, 'MESSENGER');
	});

	it('list and findByPsid give the Messenger chat shape back', async () => {
		const { service, conversations } = build();

		const [chat] = await service.list(OWNER);

		expect(conversations.listByChannel).toHaveBeenCalledWith(
			OWNER,
			'MESSENGER',
		);
		expect(chat).toMatchObject({
			psid: 'PSID1',
			pageId: 'PAGE1',
			name: 'Ana',
			profilePic: 'pic',
			unreadCount: 2,
		});
		await expect(service.findByPsid(OWNER, 'PSID1')).resolves.toMatchObject({
			psid: 'PSID1',
		});
		await expect(
			build(null).service.findByPsid(OWNER, 'X'),
		).resolves.toBeNull();
	});
});
