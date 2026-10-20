import InboxEnum from '../../inbox/interfaces/inbox.enum';
import TelegramEnum from './telegram.enum';
import { TelegramMessagesService } from './telegram-messages.service';

const OWNER = '507f1f77bcf86cd799439011';
const CONV = {
	_id: 'c1',
	channel: InboxEnum.Channel.TELEGRAM,
	contactKey: '555',
};

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
	raw: { update_id: 100 },
};

const stored = (over: any = {}): any => ({
	_id: 'm1',
	direction: 'OUT',
	channelMessageId: '42',
	kind: 'TEXT',
	text: 'claro!',
	attachments: [],
	sentAt: new Date('2030-01-02'),
	sentByEmployeeId: 'e1',
	channelData: { contentType: 'TEXT' },
	...over,
});

const build = (found: any = CONV) => {
	const conversations: any = {
		ensure: jest.fn().mockResolvedValue({ conversation: CONV, created: false }),
		findByKey: jest.fn().mockResolvedValue(found),
	};
	const messages: any = {
		saveIncoming: jest.fn().mockResolvedValue(true),
		saveOutgoing: jest.fn().mockResolvedValue(stored()),
		findOwned: jest.fn().mockResolvedValue(stored()),
		findLatest: jest.fn().mockResolvedValue(stored()),
		deleteOwned: jest.fn().mockResolvedValue(undefined),
		listByConversation: jest.fn().mockResolvedValue([stored()]),
	};

	return {
		conversations,
		messages,
		service: new TelegramMessagesService(conversations, messages),
	};
};

describe('TelegramMessagesService (over the central inbox)', () => {
	describe('saveIncoming', () => {
		it('makes sure the conversation exists and stores the message in the common shape, raw event included', async () => {
			const { service, conversations, messages } = build();

			await expect(service.saveIncoming(OWNER, incoming)).resolves.toBe(true);

			expect(conversations.ensure).toHaveBeenCalledWith(
				OWNER,
				{ channel: 'TELEGRAM', contactKey: '555' },
				{ contact: expect.objectContaining({ username: 'ana_s' }) },
			);
			expect(messages.saveIncoming).toHaveBeenCalledWith(
				OWNER,
				CONV,
				expect.objectContaining({
					channelMessageId: '7',
					kind: 'TEXT',
					text: 'oi',
					raw: { update_id: 100 },
				}),
			);
		});

		it('says false for a message it already had', async () => {
			const { service, messages } = build();
			messages.saveIncoming.mockResolvedValue(false);

			await expect(service.saveIncoming(OWNER, incoming)).resolves.toBe(false);
		});
	});

	it('saveOutgoing stores a reply and gives it back in the Telegram shape', async () => {
		const { service, messages } = build();

		const result = await service.saveOutgoing(OWNER, {
			chatId: 555,
			messageId: 42,
			text: 'claro!',
			sentAt: new Date('2030-01-02'),
			sentByEmployeeId: 'e1',
		});

		expect(messages.saveOutgoing).toHaveBeenCalledWith(
			OWNER,
			CONV,
			expect.objectContaining({
				channelMessageId: '42',
				text: 'claro!',
				sentByEmployeeId: 'e1',
			}),
		);
		expect(result).toMatchObject({
			_id: 'm1',
			chatId: 555,
			messageId: 42,
			contentType: 'TEXT',
			text: 'claro!',
			sentByEmployeeId: 'e1',
		});
	});

	describe('one message', () => {
		it('findOwned, findLatest and listByChat answer in the Telegram shape', async () => {
			const { service, messages } = build();

			await expect(service.findOwned(OWNER, 555, 'm1')).resolves.toMatchObject({
				messageId: 42,
				chatId: 555,
			});
			await expect(service.findLatest(OWNER, 555)).resolves.toMatchObject({
				messageId: 42,
			});
			await expect(
				service.listByChat(OWNER, 555, { limit: 10, before: 'x' }),
			).resolves.toHaveLength(1);

			expect(messages.findOwned).toHaveBeenCalledWith(OWNER, 'c1', 'm1');
			expect(messages.listByConversation).toHaveBeenCalledWith(OWNER, 'c1', {
				limit: 10,
				before: 'x',
			});
		});

		it('deleteOwned removes it from that conversation', async () => {
			const { service, messages } = build();

			await service.deleteOwned(OWNER, 555, 'm1');

			expect(messages.deleteOwned).toHaveBeenCalledWith(OWNER, 'c1', 'm1');
		});

		it('findWithMedia only gives a message that has a Telegram file', async () => {
			const withFile = build();
			withFile.messages.findOwned.mockResolvedValue(
				stored({
					kind: 'FILE',
					attachments: [
						{
							kind: 'FILE',
							mimeType: 'application/pdf',
							fileName: 'a.pdf',
							size: 1,
							width: null,
							height: null,
							duration: null,
							source: { type: 'TELEGRAM_FILE', fileId: 'FID' },
						},
					],
				}),
			);
			await expect(
				withFile.service.findWithMedia(OWNER, 555, 'm1'),
			).resolves.toMatchObject({ media: { fileId: 'FID' } });

			await expect(
				build().service.findWithMedia(OWNER, 555, 'm1'),
			).resolves.toBeNull();
		});
	});

	it('answers empty for a chat that does not exist', async () => {
		const { service, messages } = build(null);

		await expect(service.findOwned(OWNER, 9, 'm1')).resolves.toBeNull();
		await expect(service.findLatest(OWNER, 9)).resolves.toBeNull();
		await expect(service.listByChat(OWNER, 9)).resolves.toEqual([]);
		await service.deleteOwned(OWNER, 9, 'm1');

		expect(messages.findOwned).not.toHaveBeenCalled();
		expect(messages.deleteOwned).not.toHaveBeenCalled();
	});
});
