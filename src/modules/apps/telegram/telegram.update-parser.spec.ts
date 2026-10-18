import TelegramEnum from './telegram.enum';
import { parseTelegramUpdate } from './telegram.update-parser';

const privateMessage = (extra: any = {}, over: any = {}): any => ({
	update_id: 100,
	message: {
		message_id: 7,
		date: 1_760_000_000,
		chat: { id: 555, type: 'private' },
		from: {
			id: 555,
			is_bot: false,
			first_name: 'Ana',
			last_name: 'Souza',
			username: 'ana_s',
			language_code: 'pt-br',
		},
		...extra,
	},
	...over,
});

describe('parseTelegramUpdate', () => {
	it('turns a private text message into a storable message', () => {
		const parsed = parseTelegramUpdate(
			privateMessage({ text: 'oi, tudo bem?' }),
		);

		expect(parsed).toEqual({
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
			sentAt: new Date(1_760_000_000 * 1000),
		});
	});

	it('keeps a missing last name, username and language as null', () => {
		const parsed = parseTelegramUpdate({
			update_id: 1,
			message: {
				message_id: 1,
				date: 1,
				chat: { id: 9, type: 'private' },
				from: { id: 9, first_name: 'Bia' },
				text: 'hi',
			},
		});

		expect(parsed).toMatchObject({
			fromFirstName: 'Bia',
			fromLastName: null,
			fromUsername: null,
			fromLanguageCode: null,
		});
	});

	it.each([
		['photo', [{ file_id: 'x' }], TelegramEnum.ContentType.PHOTO],
		['document', { file_id: 'x' }, TelegramEnum.ContentType.DOCUMENT],
		['voice', { file_id: 'x' }, TelegramEnum.ContentType.VOICE],
		['audio', { file_id: 'x' }, TelegramEnum.ContentType.AUDIO],
		['video', { file_id: 'x' }, TelegramEnum.ContentType.VIDEO],
		['video_note', { file_id: 'x' }, TelegramEnum.ContentType.VIDEO_NOTE],
		['sticker', { file_id: 'x' }, TelegramEnum.ContentType.STICKER],
		[
			'location',
			{ latitude: 1, longitude: 2 },
			TelegramEnum.ContentType.LOCATION,
		],
		[
			'contact',
			{ phone_number: '1', first_name: 'x' },
			TelegramEnum.ContentType.CONTACT,
		],
	])('recognises a %s message', (key, value, expected) => {
		expect(
			parseTelegramUpdate(privateMessage({ [key]: value }))?.contentType,
		).toBe(expected);
	});

	it('uses the caption as the text of a media message', () => {
		const parsed = parseTelegramUpdate(
			privateMessage({ photo: [{ file_id: 'x' }], caption: 'olha isso' }),
		);

		expect(parsed).toMatchObject({
			contentType: TelegramEnum.ContentType.PHOTO,
			text: 'olha isso',
		});
	});

	it('marks an unknown kind of message as OTHER, with no text', () => {
		expect(
			parseTelegramUpdate(privateMessage({ dice: { value: 3 } })),
		).toMatchObject({
			contentType: TelegramEnum.ContentType.OTHER,
			text: null,
		});
	});

	it('ignores updates that are not plain messages', () => {
		expect(
			parseTelegramUpdate({
				update_id: 5,
				edited_message: { text: 'x' },
			} as any),
		).toBeNull();
		expect(
			parseTelegramUpdate({ update_id: 6, callback_query: {} } as any),
		).toBeNull();
		expect(
			parseTelegramUpdate({ update_id: 7, my_chat_member: {} } as any),
		).toBeNull();
	});

	it('ignores messages from groups, supergroups and channels', () => {
		for (const type of ['group', 'supergroup', 'channel']) {
			const update = privateMessage({ text: 'hi', chat: { id: -1, type } });

			expect(parseTelegramUpdate(update)).toBeNull();
		}
	});

	it('ignores a message without a sender', () => {
		const update = privateMessage({ text: 'hi' });
		delete update.message.from;

		expect(parseTelegramUpdate(update)).toBeNull();
	});

	it.each([
		null,
		undefined,
		'x',
		42,
		[],
		{},
		{ update_id: 'nope' },
		{ update_id: 1, message: 'x' },
	])('does not choke on malformed input %p', (input) => {
		expect(parseTelegramUpdate(input as any)).toBeNull();
	});
});
