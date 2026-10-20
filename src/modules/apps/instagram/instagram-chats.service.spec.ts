import InstagramEnum from './instagram.enum';
import { InstagramChatsService } from './instagram-chats.service';

const OWNER = '507f1f77bcf86cd799439011';

const message: any = {
	accountId: 'ACCOUNT1',
	igsid: 'IGSID1',
	mid: 'm1',
	text: 'oi',
	attachments: [],
	isUnsupported: false,
	sentAt: new Date('2030-01-01T10:00:00Z'),
};

const build = () => {
	const chain: any = {
		sort: jest.fn().mockReturnThis(),
		limit: jest.fn().mockReturnThis(),
		lean: jest.fn().mockResolvedValue([]),
	};
	const model: any = {
		updateOne: jest.fn().mockResolvedValue({ upsertedCount: 0 }),
		find: jest.fn().mockReturnValue(chain),
		aggregate: jest.fn().mockResolvedValue([{ total: 5 }]),
		findOne: jest.fn(),
	};

	return { model, chain, service: new InstagramChatsService(model) };
};

describe('InstagramChatsService', () => {
	describe('registerIncoming', () => {
		it('creates or updates the conversation: last message, the 24 hour window and one more unread', async () => {
			const { service, model } = build();

			await service.registerIncoming(OWNER, message);

			const [filter, update, options] = model.updateOne.mock.calls[0];

			expect(filter).toEqual({ ownerUserId: OWNER, igsid: 'IGSID1' });
			expect(update.$set).toEqual({
				accountId: 'ACCOUNT1',
				lastMessageAt: message.sentAt,
				lastMessageText: 'oi',
				lastAttachmentType: null,
				lastMessageDirection: InstagramEnum.Direction.IN,
				lastIncomingAt: message.sentAt,
			});
			expect(update.$inc).toEqual({ unreadCount: 1 });
			expect(update.$setOnInsert).toEqual({
				customerId: null,
				name: null,
				username: null,
				profilePic: null,
			});
			expect(options).toEqual({ upsert: true });
		});

		it('says whether this was the first message of that person', async () => {
			const { service, model } = build();

			model.updateOne.mockResolvedValue({ upsertedCount: 1 });
			await expect(service.registerIncoming(OWNER, message)).resolves.toBe(
				true,
			);

			model.updateOne.mockResolvedValue({ upsertedCount: 0 });
			await expect(service.registerIncoming(OWNER, message)).resolves.toBe(
				false,
			);
		});

		it('previews a file by its kind when there is no text, and cuts long text', async () => {
			const { service, model } = build();

			await service.registerIncoming(OWNER, {
				...message,
				text: null,
				attachments: [{ type: 'image', url: 'https://cdn.fbsbx.com/a.jpg' }],
			});
			expect(model.updateOne.mock.calls[0][1].$set).toMatchObject({
				lastMessageText: null,
				lastAttachmentType: 'image',
			});

			await service.registerIncoming(OWNER, {
				...message,
				text: 'x'.repeat(500),
			});
			expect(
				model.updateOne.mock.calls[1][1].$set.lastMessageText,
			).toHaveLength(120);
		});
	});

	it('registerOutgoing updates the last message without touching the window or the unread count', async () => {
		const { service, model } = build();
		const at = new Date('2030-01-02');

		await service.registerOutgoing(OWNER, 'IGSID1', 'claro!', at);

		const [filter, update] = model.updateOne.mock.calls[0];

		expect(filter).toEqual({ ownerUserId: OWNER, igsid: 'IGSID1' });
		expect(update.$set).toEqual({
			lastMessageAt: at,
			lastMessageText: 'claro!',
			lastAttachmentType: null,
			lastMessageDirection: InstagramEnum.Direction.OUT,
		});
		expect(update).not.toHaveProperty('$inc');
	});

	describe('registerEcho', () => {
		const echo: any = {
			accountId: 'ACCOUNT1',
			igsid: 'IGSID1',
			direction: InstagramEnum.Direction.OUT,
			mid: 'e1',
			text: 'pelo Business Suite',
			attachments: [],
			sentAt: new Date('2030-01-03T10:00:00Z'),
		};

		it('creates the conversation if the Page wrote first: no unread, and no answer window', async () => {
			const { service, model } = build();
			model.updateOne.mockResolvedValue({ upsertedCount: 1 });

			await expect(service.registerEcho(OWNER, echo)).resolves.toBe(true);

			const [filter, update, options] = model.updateOne.mock.calls[0];

			expect(filter).toEqual({ ownerUserId: OWNER, igsid: 'IGSID1' });
			expect(update.$setOnInsert).toMatchObject({
				accountId: 'ACCOUNT1',
				customerId: null,
				name: null,
				profilePic: null,
				unreadCount: 0,
				lastIncomingAt: new Date(0),
				lastMessageAt: echo.sentAt,
				lastMessageText: 'pelo Business Suite',
				lastMessageDirection: InstagramEnum.Direction.OUT,
			});
			expect(update).not.toHaveProperty('$inc');
			expect(options).toEqual({ upsert: true });
		});

		it('says false for a conversation that already existed, and then only moves the preview forward', async () => {
			const { service, model } = build();
			model.updateOne.mockResolvedValue({ upsertedCount: 0 });

			await expect(service.registerEcho(OWNER, echo)).resolves.toBe(false);

			const [filter, update] = model.updateOne.mock.calls[1];

			// An old echo arriving late must not overwrite a newer last message.
			expect(filter).toEqual({
				ownerUserId: OWNER,
				igsid: 'IGSID1',
				lastMessageAt: { $lte: echo.sentAt },
			});
			expect(update.$set).toEqual({
				lastMessageAt: echo.sentAt,
				lastMessageText: 'pelo Business Suite',
				lastAttachmentType: null,
				lastMessageDirection: InstagramEnum.Direction.OUT,
			});
			expect(update).not.toHaveProperty('$inc');
			expect(JSON.stringify(update)).not.toContain('lastIncomingAt');
		});
	});

	it('previews a message that carries nothing readable as unsupported', async () => {
		const { service, model } = build();

		await service.registerIncoming(OWNER, {
			...message,
			text: null,
			isUnsupported: true,
		});

		expect(model.updateOne.mock.calls[0][1].$set).toMatchObject({
			lastMessageText: null,
			lastAttachmentType: 'unsupported',
		});
	});

	it('setProfile keeps the name, the username and the picture Instagram gave', async () => {
		const { service, model } = build();

		await service.setProfile(OWNER, 'IGSID1', {
			name: 'Ana',
			username: 'ana_s',
			profilePic: 'https://x/p.jpg',
		});

		expect(model.updateOne).toHaveBeenCalledWith(
			{ ownerUserId: OWNER, igsid: 'IGSID1' },
			{
				$set: {
					name: 'Ana',
					username: 'ana_s',
					profilePic: 'https://x/p.jpg',
				},
			},
		);
	});

	describe('countUnread', () => {
		it('adds up the unread messages of every conversation of that owner', async () => {
			const { service, model } = build();

			await expect(service.countUnread(OWNER)).resolves.toBe(5);

			const [pipeline] = model.aggregate.mock.calls[0];
			expect(String(pipeline[0].$match.ownerUserId)).toBe(OWNER);
			expect(pipeline[1].$group.total).toEqual({ $sum: '$unreadCount' });
		});

		it('is zero when there is no conversation', async () => {
			const { service, model } = build();
			model.aggregate.mockResolvedValue([]);

			await expect(service.countUnread(OWNER)).resolves.toBe(0);
		});
	});

	it('markRead clears the unread count', async () => {
		const { service, model } = build();

		await service.markRead(OWNER, 'IGSID1');

		expect(model.updateOne).toHaveBeenCalledWith(
			{ ownerUserId: OWNER, igsid: 'IGSID1' },
			{ $set: { unreadCount: 0 } },
		);
	});

	it('setCustomer links or unlinks the person to a customer', async () => {
		const { service, model } = build();

		await service.setCustomer(OWNER, 'IGSID1', 'cu1');
		await service.setCustomer(OWNER, 'IGSID1', null);

		expect(model.updateOne.mock.calls[0][1]).toEqual({
			$set: { customerId: 'cu1' },
		});
		expect(model.updateOne.mock.calls[1][1]).toEqual({
			$set: { customerId: null },
		});
	});

	it('list returns the conversations of that owner, most recent first', async () => {
		const { service, model, chain } = build();

		await service.list(OWNER);

		expect(model.find).toHaveBeenCalledWith({ ownerUserId: OWNER });
		expect(chain.sort).toHaveBeenCalledWith({ lastMessageAt: -1 });
	});

	it('findByIgsid looks only at that owner', async () => {
		const { service, model } = build();
		model.findOne.mockResolvedValue({ igsid: 'IGSID1' });

		await service.findByIgsid(OWNER, 'IGSID1');

		expect(model.findOne).toHaveBeenCalledWith({
			ownerUserId: OWNER,
			igsid: 'IGSID1',
		});
	});
});
