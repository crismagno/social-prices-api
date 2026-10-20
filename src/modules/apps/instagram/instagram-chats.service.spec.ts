import { InstagramChatsService } from './instagram-chats.service';

const OWNER = '507f1f77bcf86cd799439011';
const KEY = { channel: 'INSTAGRAM', contactKey: 'IGSID1' };

const message = (over: any = {}): any => ({
	accountId: 'ACCOUNT1',
	igsid: 'IGSID1',
	direction: 'IN',
	mid: 'm1',
	text: 'oi',
	attachments: [],
	isUnsupported: false,
	sentAt: new Date('2030-01-01T10:00:00Z'),
	...over,
});

const conversation = (over: any = {}): any => ({
	_id: 'c1',
	contactKey: 'IGSID1',
	accountKey: 'ACCOUNT1',
	contact: { name: 'Ana', username: 'ana_s', profilePic: 'pic' },
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
		setPreview: jest.fn().mockResolvedValue(undefined),
		markRead: jest.fn().mockResolvedValue(undefined),
		setCustomer: jest.fn().mockResolvedValue(undefined),
		countUnread: jest.fn().mockResolvedValue(4),
		listByChannel: jest.fn().mockResolvedValue([conversation()]),
		findByKey: jest.fn().mockResolvedValue(found),
	};

	return { conversations, service: new InstagramChatsService(conversations) };
};

describe('InstagramChatsService (over the central inbox)', () => {
	describe('registerIncoming', () => {
		it('opens the conversation on the Page and moves it with what the person said', async () => {
			const { service, conversations } = build();

			await service.registerIncoming(OWNER, message());

			expect(conversations.ensure).toHaveBeenCalledWith(OWNER, KEY, {
				accountKey: 'ACCOUNT1',
			});
			expect(conversations.applyIncoming).toHaveBeenCalledWith(OWNER, 'c1', {
				accountKey: 'ACCOUNT1',
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

	it('registerOutgoing moves the preview with the text sent', async () => {
		const { service, conversations } = build();
		const at = new Date('2030-01-02');

		await service.registerOutgoing(OWNER, 'IGSID1', 'claro', at);

		expect(conversations.applyOutgoing).toHaveBeenCalledWith(OWNER, 'c1', {
			text: 'claro',
			kind: 'TEXT',
			channelKind: null,
			direction: 'OUT',
			at,
		});
	});

	it('setLastMessage points the inbox at the message that is now the newest', async () => {
		const { service, conversations } = build();
		const sentAt = new Date('2030-01-03');

		await service.setLastMessage(OWNER, 'IGSID1', {
			text: null,
			attachments: [],
			isUnsupported: true,
			direction: 'IN',
			sentAt,
		} as any);

		expect(conversations.setPreview).toHaveBeenCalledWith(OWNER, 'c1', {
			text: null,
			kind: 'UNSUPPORTED',
			channelKind: 'unsupported',
			direction: 'IN',
			at: sentAt,
		});

		const none = build(null);
		await none.service.setLastMessage(OWNER, 'X', {} as any);
		expect(none.conversations.setPreview).not.toHaveBeenCalled();
	});

	it('previews a message that carries nothing readable as unsupported', async () => {
		const { service, conversations } = build();

		await service.registerIncoming(
			OWNER,
			message({ text: null, isUnsupported: true }),
		);

		expect(conversations.applyIncoming.mock.calls[0][2].preview).toMatchObject({
			text: null,
			kind: 'UNSUPPORTED',
			channelKind: 'unsupported',
		});
	});

	it('setProfile keeps the name and picture Instagram gave', async () => {
		const { service, conversations } = build();

		await service.setProfile(OWNER, 'IGSID1', {
			name: 'Ana',
			username: 'ana_s',
			profilePic: 'p',
		});

		expect(conversations.setContact).toHaveBeenCalledWith(OWNER, 'c1', {
			name: 'Ana',
			username: 'ana_s',
			profilePic: 'p',
		});
	});

	it('markRead and setCustomer act on that conversation', async () => {
		const { service, conversations } = build();

		await service.markRead(OWNER, 'IGSID1');
		await service.setCustomer(OWNER, 'IGSID1', 'cu1');
		await service.setCustomer(OWNER, 'IGSID1', null);

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
		await service.setProfile(OWNER, 'X', {
			name: 'A',
			username: null,
			profilePic: null,
		});
		await service.registerOutgoing(OWNER, 'X', 'a', new Date());

		expect(conversations.markRead).not.toHaveBeenCalled();
		expect(conversations.setCustomer).not.toHaveBeenCalled();
		expect(conversations.setContact).not.toHaveBeenCalled();
		expect(conversations.applyOutgoing).not.toHaveBeenCalled();
	});

	it('countUnread counts the Instagram conversations only', async () => {
		const { service, conversations } = build();

		await expect(service.countUnread(OWNER)).resolves.toBe(4);
		expect(conversations.countUnread).toHaveBeenCalledWith(OWNER, 'INSTAGRAM');
	});

	it('list and findByIgsid give the Instagram chat shape back', async () => {
		const { service, conversations } = build();

		const [chat] = await service.list(OWNER);

		expect(conversations.listByChannel).toHaveBeenCalledWith(
			OWNER,
			'INSTAGRAM',
		);
		expect(chat).toMatchObject({
			igsid: 'IGSID1',
			accountId: 'ACCOUNT1',
			name: 'Ana',
			username: 'ana_s',
			profilePic: 'pic',
			unreadCount: 2,
		});
		await expect(service.findByIgsid(OWNER, 'IGSID1')).resolves.toMatchObject({
			igsid: 'IGSID1',
		});
		await expect(
			build(null).service.findByIgsid(OWNER, 'X'),
		).resolves.toBeNull();
	});
});
