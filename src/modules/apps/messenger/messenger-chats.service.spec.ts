import MessengerEnum from './messenger.enum';
import { MessengerChatsService } from './messenger-chats.service';

const OWNER = '507f1f77bcf86cd799439011';

const message: any = {
	pageId: 'PAGE1',
	psid: 'PSID1',
	mid: 'm1',
	text: 'oi',
	attachments: [],
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
		findOne: jest.fn(),
	};

	return { model, chain, service: new MessengerChatsService(model) };
};

describe('MessengerChatsService', () => {
	describe('registerIncoming', () => {
		it('creates or updates the conversation: last message, the 24 hour window and one more unread', async () => {
			const { service, model } = build();

			await service.registerIncoming(OWNER, message);

			const [filter, update, options] = model.updateOne.mock.calls[0];

			expect(filter).toEqual({ ownerUserId: OWNER, psid: 'PSID1' });
			expect(update.$set).toEqual({
				pageId: 'PAGE1',
				lastMessageAt: message.sentAt,
				lastMessageText: 'oi',
				lastAttachmentType: null,
				lastMessageDirection: MessengerEnum.Direction.IN,
				lastIncomingAt: message.sentAt,
			});
			expect(update.$inc).toEqual({ unreadCount: 1 });
			expect(update.$setOnInsert).toEqual({
				customerId: null,
				name: null,
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

		await service.registerOutgoing(OWNER, 'PSID1', 'claro!', at);

		const [filter, update] = model.updateOne.mock.calls[0];

		expect(filter).toEqual({ ownerUserId: OWNER, psid: 'PSID1' });
		expect(update.$set).toEqual({
			lastMessageAt: at,
			lastMessageText: 'claro!',
			lastAttachmentType: null,
			lastMessageDirection: MessengerEnum.Direction.OUT,
		});
		expect(update).not.toHaveProperty('$inc');
	});

	it('setProfile keeps the name and picture Facebook gave', async () => {
		const { service, model } = build();

		await service.setProfile(OWNER, 'PSID1', {
			name: 'Ana',
			profilePic: 'https://x/p.jpg',
		});

		expect(model.updateOne).toHaveBeenCalledWith(
			{ ownerUserId: OWNER, psid: 'PSID1' },
			{ $set: { name: 'Ana', profilePic: 'https://x/p.jpg' } },
		);
	});

	it('markRead clears the unread count', async () => {
		const { service, model } = build();

		await service.markRead(OWNER, 'PSID1');

		expect(model.updateOne).toHaveBeenCalledWith(
			{ ownerUserId: OWNER, psid: 'PSID1' },
			{ $set: { unreadCount: 0 } },
		);
	});

	it('setCustomer links or unlinks the person to a customer', async () => {
		const { service, model } = build();

		await service.setCustomer(OWNER, 'PSID1', 'cu1');
		await service.setCustomer(OWNER, 'PSID1', null);

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

	it('findByPsid looks only at that owner', async () => {
		const { service, model } = build();
		model.findOne.mockResolvedValue({ psid: 'PSID1' });

		await service.findByPsid(OWNER, 'PSID1');

		expect(model.findOne).toHaveBeenCalledWith({
			ownerUserId: OWNER,
			psid: 'PSID1',
		});
	});
});
