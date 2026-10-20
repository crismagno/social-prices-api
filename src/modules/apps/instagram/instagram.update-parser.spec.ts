import InstagramEnum from './instagram.enum';
import { parseInstagramWebhook } from './instagram.update-parser';

const body = (messaging: any[], accountId = 'ACCOUNT1'): any => ({
	object: 'instagram',
	entry: [{ id: accountId, time: 1, messaging }],
});

const event = (message: any, over: any = {}): any => ({
	sender: { id: 'IGSID1' },
	recipient: { id: 'ACCOUNT1' },
	timestamp: 1_760_000_000_000,
	message,
	...over,
});

describe('parseInstagramWebhook', () => {
	it('turns a text message into a storable one', () => {
		expect(
			parseInstagramWebhook(
				body([event({ mid: 'm1', text: 'oi, tudo bem?' })]),
			),
		).toEqual([
			{
				accountId: 'ACCOUNT1',
				igsid: 'IGSID1',
				direction: InstagramEnum.Direction.IN,
				mid: 'm1',
				text: 'oi, tudo bem?',
				attachments: [],
				isUnsupported: false,
				sentAt: new Date(1_760_000_000_000),
			},
		]);
	});

	it('keeps the files of a message, with their kind and address', () => {
		const [message] = parseInstagramWebhook(
			body([
				event({
					mid: 'm2',
					attachments: [
						{ type: 'image', payload: { url: 'https://cdn.fbsbx.com/a.jpg' } },
						{ type: 'audio', payload: { url: 'https://cdn.fbsbx.com/b.mp4' } },
					],
				}),
			]),
		);

		expect(message.text).toBeNull();
		expect(message.isUnsupported).toBe(false);
		expect(message.attachments).toEqual([
			{ type: 'image', url: 'https://cdn.fbsbx.com/a.jpg' },
			{ type: 'audio', url: 'https://cdn.fbsbx.com/b.mp4' },
		]);
	});

	it('marks a message that carries nothing readable as unsupported, such as a like', () => {
		const [empty, flagged] = parseInstagramWebhook(
			body([
				event({ mid: 'm3' }),
				event({ mid: 'm4', text: 'x', is_unsupported: true }),
			]),
		);

		expect(empty.isUnsupported).toBe(true);
		expect(flagged.isUnsupported).toBe(true);
	});

	it('reads several events of several accounts in one delivery', () => {
		const parsed = parseInstagramWebhook({
			object: 'instagram',
			entry: [
				{ id: 'ACCOUNT1', messaging: [event({ mid: 'a', text: '1' })] },
				{
					id: 'ACCOUNT2',
					messaging: [
						event({ mid: 'b', text: '2' }, { recipient: { id: 'ACCOUNT2' } }),
						event({ mid: 'c', text: '3' }, { recipient: { id: 'ACCOUNT2' } }),
					],
				},
			],
		});

		expect(parsed.map((m) => [m.accountId, m.mid])).toEqual([
			['ACCOUNT1', 'a'],
			['ACCOUNT2', 'b'],
			['ACCOUNT2', 'c'],
		]);
	});

	it('ignores what is not a message: reactions, reads, a message that was unsent, and an account writing to itself', () => {
		expect(
			parseInstagramWebhook(
				body([
					event(undefined, { reaction: { action: 'react', emoji: '❤️' } }),
					event(undefined, { read: { mid: 'x' } }),
					event({ mid: 'gone', is_deleted: true }),
					event(
						{ mid: 'sent-by-account', text: 'x' },
						{ sender: { id: 'ACCOUNT1' } },
					),
				]),
			),
		).toEqual([]);
	});

	describe('echoes: what the account itself sent, from the Instagram app or from this system', () => {
		const echo = (message: any, over: any = {}) =>
			event(
				{ is_echo: true, ...message },
				{ sender: { id: 'ACCOUNT1' }, recipient: { id: 'IGSID1' }, ...over },
			);

		it('is an OUT message of the conversation with the person it was sent to', () => {
			expect(
				parseInstagramWebhook(
					body([echo({ mid: 'e1', text: 'enviada pelo app do Instagram' })]),
				),
			).toEqual([
				{
					accountId: 'ACCOUNT1',
					igsid: 'IGSID1',
					direction: InstagramEnum.Direction.OUT,
					mid: 'e1',
					text: 'enviada pelo app do Instagram',
					attachments: [],
					isUnsupported: false,
					sentAt: new Date(1_760_000_000_000),
				},
			]);
		});

		it('is dropped when it was not sent by this account, or has no one it was sent to', () => {
			expect(
				parseInstagramWebhook(
					body([
						echo({ mid: 'e3', text: 'x' }, { sender: { id: 'SOMEONE' } }),
						echo({ mid: 'e4', text: 'x' }, { recipient: {} }),
						echo({ text: 'sem mid' }),
					]),
				),
			).toEqual([]);
		});
	});

	it.each([
		null,
		undefined,
		'x',
		1,
		[],
		{},
		{ object: 'page', entry: [] },
		{ object: 'instagram' },
		body([null, 'x', {}]),
	])(
		'never throws and returns nothing for a body that is not an instagram event (%p)',
		(input) => {
			expect(parseInstagramWebhook(input as any)).toEqual([]);
		},
	);

	it('skips a message without an id, so nothing can be stored twice', () => {
		expect(parseInstagramWebhook(body([event({ text: 'sem mid' })]))).toEqual(
			[],
		);
	});
});
