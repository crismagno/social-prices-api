import InboxEnum from '../../inbox/interfaces/inbox.enum';
import TelegramEnum from './telegram.enum';
import {
	contactOf,
	inboxInputOf,
	kindOf,
	previewOf,
	toTelegramChat,
	toTelegramMessage,
} from './telegram.inbox-mapper';

const FILE = {
	fileId: 'FID',
	fileName: 'a.pdf',
	mimeType: 'application/pdf',
	size: 2048,
	width: null,
	height: null,
	duration: null,
};

const incoming: any = {
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
	raw: { update_id: 100 },
};

describe('kindOf', () => {
	it.each([
		[TelegramEnum.ContentType.TEXT, InboxEnum.MessageKind.TEXT],
		[TelegramEnum.ContentType.PHOTO, InboxEnum.MessageKind.IMAGE],
		[TelegramEnum.ContentType.DOCUMENT, InboxEnum.MessageKind.FILE],
		[TelegramEnum.ContentType.VOICE, InboxEnum.MessageKind.VOICE],
		[TelegramEnum.ContentType.AUDIO, InboxEnum.MessageKind.AUDIO],
		[TelegramEnum.ContentType.VIDEO, InboxEnum.MessageKind.VIDEO],
		[TelegramEnum.ContentType.VIDEO_NOTE, InboxEnum.MessageKind.VIDEO],
		[TelegramEnum.ContentType.STICKER, InboxEnum.MessageKind.STICKER],
		[TelegramEnum.ContentType.LOCATION, InboxEnum.MessageKind.LOCATION],
		[TelegramEnum.ContentType.CONTACT, InboxEnum.MessageKind.CONTACT],
		[TelegramEnum.ContentType.OTHER, InboxEnum.MessageKind.OTHER],
	])('%s is a %s', (contentType, kind) => {
		expect(kindOf(contentType)).toBe(kind);
	});
});

describe('inboxInputOf', () => {
	it('turns a customer message into the common shape, keeping what only Telegram has', () => {
		expect(inboxInputOf(incoming)).toEqual({
			channelMessageId: '7',
			kind: 'TEXT',
			text: 'oi',
			attachments: [],
			sentAt: incoming.sentAt,
			sender: { id: '555', name: 'Ana Souza', username: 'ana_s' },
			channelData: {
				contentType: 'TEXT',
				updateId: 100,
				fromLanguageCode: 'pt-br',
			},
			raw: { update_id: 100 },
		});
	});

	it('describes the file of a message so it can be fetched from Telegram again', () => {
		const input = inboxInputOf({
			...incoming,
			contentType: TelegramEnum.ContentType.DOCUMENT,
			text: 'segue',
			media: FILE,
		});

		expect(input.kind).toBe('FILE');
		expect(input.attachments).toEqual([
			{
				kind: 'FILE',
				mimeType: 'application/pdf',
				fileName: 'a.pdf',
				size: 2048,
				width: null,
				height: null,
				duration: null,
				source: { type: 'TELEGRAM_FILE', fileId: 'FID' },
			},
		]);
	});

	it('takes what was sent from here as it comes: the employee, no sender', () => {
		const input = inboxInputOf({
			chatId: 555,
			messageId: 42,
			text: 'claro!',
			contentType: TelegramEnum.ContentType.TEXT,
			sentAt: new Date('2030-01-02'),
			sentByEmployeeId: 'e1',
		} as any);

		expect(input).toMatchObject({
			channelMessageId: '42',
			sentByEmployeeId: 'e1',
			sender: null,
		});
	});

	it('defaults an outgoing message to text', () => {
		expect(
			inboxInputOf({
				chatId: 1,
				messageId: 2,
				text: 'x',
				sentAt: new Date(),
				sentByEmployeeId: null,
			} as any).kind,
		).toBe('TEXT');
	});
});

describe('contactOf', () => {
	it('keeps the name, username and language, and the Telegram ids in extra', () => {
		expect(contactOf(incoming)).toEqual({
			name: 'Ana Souza',
			username: 'ana_s',
			languageCode: 'pt-br',
			extra: { telegramUserId: 555, firstName: 'Ana', lastName: 'Souza' },
		});
	});

	it('has no name when Telegram gave none', () => {
		expect(
			contactOf({ ...incoming, fromFirstName: null, fromLastName: null }).name,
		).toBeNull();
	});
});

describe('previewOf', () => {
	it('is the inbox line of a message, remembering the Telegram content type', () => {
		expect(
			previewOf(
				'oi',
				TelegramEnum.ContentType.TEXT,
				TelegramEnum.Direction.IN,
				incoming.sentAt,
			),
		).toEqual({
			text: 'oi',
			kind: 'TEXT',
			channelKind: 'TEXT',
			direction: 'IN',
			at: incoming.sentAt,
		});
	});
});

describe('toTelegramChat', () => {
	const conversation: any = {
		_id: 'c1',
		ownerUserId: 'u1',
		contactKey: '555',
		contact: {
			name: 'Ana Souza',
			username: 'ana_s',
			languageCode: 'pt-br',
			extra: { telegramUserId: 555, firstName: 'Ana', lastName: 'Souza' },
		},
		customerId: 'cu1',
		lastMessageAt: new Date('2030-01-01'),
		lastMessageText: null,
		lastMessageChannelKind: 'PHOTO',
		lastMessageDirection: 'IN',
		unreadCount: 2,
		createdAt: new Date('2029-12-31'),
		updatedAt: new Date('2030-01-01'),
	};

	it('gives the app its own chat shape back', () => {
		expect(toTelegramChat(conversation)).toMatchObject({
			_id: 'c1',
			chatId: 555,
			telegramUserId: 555,
			firstName: 'Ana',
			lastName: 'Souza',
			username: 'ana_s',
			languageCode: 'pt-br',
			customerId: 'cu1',
			lastMessageDirection: 'IN',
			unreadCount: 2,
		});
	});

	it('shows a message without text as its Telegram content type in brackets, as the app expects', () => {
		const chat = toTelegramChat(conversation);

		expect(chat.lastMessageText).toBe('[PHOTO]');
		expect(chat.lastContentType).toBe('PHOTO');
	});

	it('shows the text when there is one', () => {
		expect(
			toTelegramChat({
				...conversation,
				lastMessageText: 'oi',
				lastMessageChannelKind: 'TEXT',
			}).lastMessageText,
		).toBe('oi');
	});
});

describe('toTelegramMessage', () => {
	const message: any = {
		_id: 'm1',
		ownerUserId: 'u1',
		direction: 'IN',
		channelMessageId: '7',
		kind: 'FILE',
		text: 'segue',
		attachments: [
			{
				kind: 'FILE',
				mimeType: 'application/pdf',
				fileName: 'a.pdf',
				size: 2048,
				width: null,
				height: null,
				duration: null,
				source: { type: 'TELEGRAM_FILE', fileId: 'FID' },
			},
		],
		sender: { id: '555', name: 'Ana Souza', username: 'ana_s' },
		sentAt: new Date('2030-01-01'),
		sentByEmployeeId: null,
		channelData: {
			contentType: 'DOCUMENT',
			updateId: 100,
			fromLanguageCode: 'pt-br',
		},
		createdAt: new Date('2030-01-01'),
	};

	it('gives the app its own message shape back, file included', () => {
		expect(toTelegramMessage(message, 555)).toMatchObject({
			_id: 'm1',
			direction: 'IN',
			chatId: 555,
			messageId: 7,
			contentType: 'DOCUMENT',
			text: 'segue',
			media: FILE,
			updateId: 100,
		});
	});

	it('has no media for a message without a Telegram file', () => {
		expect(
			toTelegramMessage({ ...message, attachments: [] }, 555).media,
		).toBeUndefined();
	});

	it('falls back to the kind when the Telegram content type was not kept', () => {
		expect(
			toTelegramMessage({ ...message, channelData: null, kind: 'IMAGE' }, 555)
				.contentType,
		).toBe('PHOTO');
	});
});
