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

	describe('media', () => {
		const media = (extra: any) =>
			parseTelegramUpdate(privateMessage(extra))?.media;

		it('takes the biggest size of a photo and keeps the caption as text', () => {
			const parsed = parseTelegramUpdate(
				privateMessage({
					caption: 'olha isso',
					photo: [
						{ file_id: 'small', width: 90, height: 60, file_size: 1000 },
						{ file_id: 'big', width: 1280, height: 853, file_size: 90000 },
					],
				}),
			);

			expect(parsed?.contentType).toBe(TelegramEnum.ContentType.PHOTO);
			expect(parsed?.text).toBe('olha isso');
			expect(parsed?.media).toEqual({
				fileId: 'big',
				fileName: null,
				mimeType: 'image/jpeg',
				size: 90000,
				width: 1280,
				height: 853,
				duration: null,
			});
		});

		it('keeps name, type and size of a document', () => {
			expect(
				media({
					document: {
						file_id: 'd1',
						file_name: 'orcamento.pdf',
						mime_type: 'application/pdf',
						file_size: 2048,
					},
				}),
			).toMatchObject({
				fileId: 'd1',
				fileName: 'orcamento.pdf',
				mimeType: 'application/pdf',
				size: 2048,
			});
		});

		it.each([
			['voice', { file_id: 'v', duration: 4 }, 'audio/ogg'],
			[
				'video',
				{ file_id: 'v', duration: 9, width: 640, height: 360 },
				'video/mp4',
			],
			['video_note', { file_id: 'v', duration: 3 }, 'video/mp4'],
			['audio', { file_id: 'v', mime_type: 'audio/mpeg' }, 'audio/mpeg'],
		])('reads a %s', (key, body, mimeType) => {
			expect(media({ [key]: body })).toMatchObject({ fileId: 'v', mimeType });
		});

		it('tells static, video and animated stickers apart by type', () => {
			expect(media({ sticker: { file_id: 's' } })?.mimeType).toBe('image/webp');
			expect(
				media({ sticker: { file_id: 's', is_video: true } })?.mimeType,
			).toBe('video/webm');
			expect(
				media({ sticker: { file_id: 's', is_animated: true } })?.mimeType,
			).toBe('application/x-tgsticker');
		});

		it('has no media for text, locations or a file without an id', () => {
			expect(media({ text: 'oi' })).toBeUndefined();
			expect(
				media({ location: { latitude: 1, longitude: 2 } }),
			).toBeUndefined();
			expect(media({ document: { file_name: 'x' } })).toBeUndefined();
		});
	});
});
