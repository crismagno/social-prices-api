import TelegramEnum from './telegram.enum';
import { TelegramMessagesService } from './telegram-messages.service';

const OWNER = '507f1f77bcf86cd799439011';

const incoming: any = {
	updateId: 100,
	messageId: 7,
	chatId: 555,
	fromUserId: 555,
	fromFirstName: 'Ana',
	fromLastName: null,
	fromUsername: 'ana_s',
	fromLanguageCode: 'pt-br',
	contentType: TelegramEnum.ContentType.TEXT,
	text: 'oi',
	sentAt: new Date('2030-01-01'),
};

const build = () => {
	const chain: any = {
		sort: jest.fn().mockReturnThis(),
		limit: jest.fn().mockReturnThis(),
		lean: jest.fn().mockResolvedValue([{ _id: 'm1' }]),
	};
	const model: any = {
		create: jest.fn().mockResolvedValue({ _id: 'm1' }),
		find: jest.fn().mockReturnValue(chain),
	};

	return { model, chain, service: new TelegramMessagesService(model) };
};

describe('TelegramMessagesService', () => {
	describe('saveIncoming', () => {
		it('stores the customer message for the owner, as IN, and says it was saved', async () => {
			const { service, model } = build();

			await expect(service.saveIncoming(OWNER, incoming)).resolves.toBe(true);

			expect(model.create).toHaveBeenCalledWith({
				ownerUserId: OWNER,
				direction: TelegramEnum.Direction.IN,
				...incoming,
			});
		});

		it('treats a repeated delivery as already saved, not as an error', async () => {
			const { service, model } = build();
			model.create.mockRejectedValue({ code: 11000 });

			await expect(service.saveIncoming(OWNER, incoming)).resolves.toBe(false);
		});

		it('lets any other failure through, so Telegram retries', async () => {
			const { service, model } = build();
			model.create.mockRejectedValue(new Error('db down'));

			await expect(service.saveIncoming(OWNER, incoming)).rejects.toThrow(
				'db down',
			);
		});
	});

	describe('saveOutgoing', () => {
		it('stores what was sent from this system, as OUT, with who sent it', async () => {
			const { service, model } = build();
			const sentAt = new Date('2030-01-02');

			await service.saveOutgoing(OWNER, {
				chatId: 555,
				messageId: 9,
				text: 'claro!',
				sentAt,
				sentByEmployeeId: 'e1',
			});

			expect(model.create).toHaveBeenCalledWith({
				ownerUserId: OWNER,
				direction: TelegramEnum.Direction.OUT,
				chatId: 555,
				messageId: 9,
				contentType: TelegramEnum.ContentType.TEXT,
				text: 'claro!',
				sentAt,
				sentByEmployeeId: 'e1',
			});
		});
	});

	describe('saveOutgoing with a file', () => {
		it('stores the kind of message and the file Telegram kept', async () => {
			const { service, model } = build();
			const media: any = { fileId: 'FID', fileName: 'a.pdf' };

			await service.saveOutgoing(OWNER, {
				chatId: 555,
				messageId: 10,
				text: 'segue',
				contentType: TelegramEnum.ContentType.DOCUMENT,
				media,
				sentAt: new Date('2030-01-02'),
				sentByEmployeeId: null,
			});

			expect(model.create).toHaveBeenCalledWith(
				expect.objectContaining({
					contentType: TelegramEnum.ContentType.DOCUMENT,
					text: 'segue',
					media,
				}),
			);
		});
	});

	describe('findOwned', () => {
		it("finds one message of that owner's chat", async () => {
			const { service, model } = build();
			model.findOne = jest.fn().mockReturnValue({
				lean: jest.fn().mockResolvedValue({ _id: 'm1' }),
			});

			await expect(service.findOwned(OWNER, 555, 'm1')).resolves.toEqual({
				_id: 'm1',
			});
			expect(model.findOne).toHaveBeenCalledWith({
				_id: 'm1',
				ownerUserId: OWNER,
				chatId: 555,
			});
		});
	});

	describe('deleteOwned', () => {
		it("removes that one message, only if it is the owner's", async () => {
			const { service, model } = build();
			model.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });

			await service.deleteOwned(OWNER, 555, 'm1');

			expect(model.deleteOne).toHaveBeenCalledWith({
				_id: 'm1',
				ownerUserId: OWNER,
				chatId: 555,
			});
		});
	});

	describe('findLatest', () => {
		it('returns the newest message left in a conversation', async () => {
			const { service, model, chain } = build();
			chain.lean.mockResolvedValue({ _id: 'm9' });
			model.findOne = jest.fn().mockReturnValue(chain);

			await expect(service.findLatest(OWNER, 555)).resolves.toEqual({
				_id: 'm9',
			});
			expect(model.findOne).toHaveBeenCalledWith({
				ownerUserId: OWNER,
				chatId: 555,
			});
			expect(chain.sort).toHaveBeenCalledWith({ sentAt: -1, _id: -1 });
		});
	});

	describe('findWithMedia', () => {
		it("finds one message of that owner's chat, and only when it has a file", async () => {
			const { service, model } = build();
			model.findOne = jest.fn().mockReturnValue({
				lean: jest.fn().mockResolvedValue({ _id: 'm1' }),
			});

			await expect(service.findWithMedia(OWNER, 555, 'm1')).resolves.toEqual({
				_id: 'm1',
			});
			expect(model.findOne).toHaveBeenCalledWith({
				_id: 'm1',
				ownerUserId: OWNER,
				chatId: 555,
				'media.fileId': { $exists: true },
			});
		});
	});

	describe('listByChat', () => {
		it('returns one conversation, newest first, for that owner only', async () => {
			const { service, model, chain } = build();

			await expect(
				service.listByChat(OWNER, 555, { limit: 20 }),
			).resolves.toEqual([{ _id: 'm1' }]);

			expect(model.find).toHaveBeenCalledWith({
				ownerUserId: OWNER,
				chatId: 555,
			});
			expect(chain.sort).toHaveBeenCalledWith({ _id: -1 });
			expect(chain.limit).toHaveBeenCalledWith(20);
		});

		it('continues from a cursor: only messages older than it', async () => {
			const { service, model } = build();

			await service.listByChat(OWNER, 555, {
				before: '507f1f77bcf86cd799439099',
			});

			expect(model.find).toHaveBeenCalledWith({
				ownerUserId: OWNER,
				chatId: 555,
				_id: { $lt: '507f1f77bcf86cd799439099' },
			});
		});

		it.each([
			[undefined, 50],
			[0, 1],
			[-5, 1],
			[7, 7],
			[500, 100],
			[Number.NaN, 50],
			[2.9, 2],
		])('clamps a limit of %p to %p', async (asked, used) => {
			const { service, chain } = build();

			await service.listByChat(OWNER, 555, { limit: asked as any });

			expect(chain.limit).toHaveBeenCalledWith(used);
		});
	});
});
