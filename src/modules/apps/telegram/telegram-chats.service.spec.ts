import TelegramEnum from './telegram.enum';
import { TelegramChatsService } from './telegram-chats.service';

const OWNER = '507f1f77bcf86cd799439011';

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
	text: 'oi, tudo bem?',
	sentAt: new Date('2030-01-01'),
};

const build = () => {
	const chain: any = {
		sort: jest.fn().mockReturnThis(),
		limit: jest.fn().mockReturnThis(),
		lean: jest.fn().mockResolvedValue([{ chatId: 555 }]),
	};
	const model: any = {
		updateOne: jest.fn().mockResolvedValue({ upsertedCount: 0 }),
		findOne: jest.fn().mockResolvedValue({ chatId: 555 }),
		find: jest.fn().mockReturnValue(chain),
	};

	return { model, chain, service: new TelegramChatsService(model) };
};

describe('TelegramChatsService', () => {
	describe('registerIncoming', () => {
		it('keeps the contact and the last message up to date and counts one more unread', async () => {
			const { service, model } = build();

			await service.registerIncoming(OWNER, message);

			const [filter, update, options] = model.updateOne.mock.calls[0];

			expect(filter).toEqual({ ownerUserId: OWNER, chatId: 555 });
			expect(update.$set).toMatchObject({
				telegramUserId: 555,
				firstName: 'Ana',
				lastName: 'Souza',
				username: 'ana_s',
				languageCode: 'pt-br',
				lastMessageAt: message.sentAt,
				lastMessageText: 'oi, tudo bem?',
				lastMessageDirection: TelegramEnum.Direction.IN,
				lastContentType: TelegramEnum.ContentType.TEXT,
			});
			expect(update.$inc).toEqual({ unreadCount: 1 });
			expect(update.$setOnInsert).toMatchObject({ customerId: null });
			expect(options).toMatchObject({ upsert: true });
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

		it('previews media by its kind when there is no text, and cuts long text', async () => {
			const { service, model } = build();

			await service.registerIncoming(OWNER, {
				...message,
				contentType: TelegramEnum.ContentType.PHOTO,
				text: null,
			});
			expect(model.updateOne.mock.calls[0][1].$set.lastMessageText).toBe(
				'[PHOTO]',
			);

			await service.registerIncoming(OWNER, {
				...message,
				text: 'x'.repeat(500),
			});
			expect(
				model.updateOne.mock.calls[1][1].$set.lastMessageText,
			).toHaveLength(200);
		});
	});

	it('registerOutgoing updates the last message without touching the unread count', async () => {
		const { service, model } = build();
		const at = new Date('2030-01-02');

		await service.registerOutgoing(OWNER, 555, 'claro!', at);

		const [filter, update] = model.updateOne.mock.calls[0];

		expect(filter).toEqual({ ownerUserId: OWNER, chatId: 555 });
		expect(update.$set).toMatchObject({
			lastMessageAt: at,
			lastMessageText: 'claro!',
			lastMessageDirection: TelegramEnum.Direction.OUT,
		});
		expect(update).not.toHaveProperty('$inc');
	});

	it('registerOutgoing previews a file by its kind when it has no caption', async () => {
		const { service, model } = build();

		await service.registerOutgoing(
			OWNER,
			555,
			null,
			new Date('2030-01-02'),
			TelegramEnum.ContentType.PHOTO,
		);

		expect(model.updateOne.mock.calls[0][1].$set).toMatchObject({
			lastMessageText: '[PHOTO]',
			lastContentType: TelegramEnum.ContentType.PHOTO,
		});
	});

	it('setLastMessage points the inbox at the message that is now the newest', async () => {
		const { service, model } = build();
		const sentAt = new Date('2030-01-02');

		await service.setLastMessage(OWNER, 555, {
			direction: TelegramEnum.Direction.IN,
			contentType: TelegramEnum.ContentType.PHOTO,
			text: null,
			sentAt,
		} as any);

		expect(model.updateOne).toHaveBeenCalledWith(
			{ ownerUserId: OWNER, chatId: 555 },
			{
				$set: {
					lastMessageAt: sentAt,
					lastMessageText: '[PHOTO]',
					lastMessageDirection: TelegramEnum.Direction.IN,
					lastContentType: TelegramEnum.ContentType.PHOTO,
				},
			},
		);
	});

	it('markRead clears the unread count', async () => {
		const { service, model } = build();

		await service.markRead(OWNER, 555);

		expect(model.updateOne).toHaveBeenCalledWith(
			{ ownerUserId: OWNER, chatId: 555 },
			{ $set: { unreadCount: 0 } },
		);
	});

	it('setCustomer links or unlinks the person to a customer', async () => {
		const { service, model } = build();

		await service.setCustomer(OWNER, 555, 'cu1');
		await service.setCustomer(OWNER, 555, null);

		expect(model.updateOne).toHaveBeenNthCalledWith(
			1,
			{ ownerUserId: OWNER, chatId: 555 },
			{ $set: { customerId: 'cu1' } },
		);
		expect(model.updateOne).toHaveBeenNthCalledWith(
			2,
			{ ownerUserId: OWNER, chatId: 555 },
			{ $set: { customerId: null } },
		);
	});

	it('list returns the conversations, the most recent first, for that owner only', async () => {
		const { service, model, chain } = build();

		await expect(service.list(OWNER)).resolves.toEqual([{ chatId: 555 }]);

		expect(model.find).toHaveBeenCalledWith({ ownerUserId: OWNER });
		expect(chain.sort).toHaveBeenCalledWith({ lastMessageAt: -1 });
		expect(chain.limit).toHaveBeenCalledWith(200);
	});

	it('findByChatId looks a conversation up by owner and chat', async () => {
		const { service, model } = build();

		await service.findByChatId(OWNER, 555);

		expect(model.findOne).toHaveBeenCalledWith({
			ownerUserId: OWNER,
			chatId: 555,
		});
	});
});
