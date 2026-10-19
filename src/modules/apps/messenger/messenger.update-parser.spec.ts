import { parseMessengerWebhook } from './messenger.update-parser';

const body = (messaging: any[], pageId = 'PAGE1'): any => ({
	object: 'page',
	entry: [{ id: pageId, time: 1, messaging }],
});

const event = (message: any, over: any = {}): any => ({
	sender: { id: 'PSID1' },
	recipient: { id: 'PAGE1' },
	timestamp: 1_760_000_000_000,
	message,
	...over,
});

describe('parseMessengerWebhook', () => {
	it('turns a text message into a storable one', () => {
		expect(
			parseMessengerWebhook(
				body([event({ mid: 'm1', text: 'oi, tudo bem?' })]),
			),
		).toEqual([
			{
				pageId: 'PAGE1',
				psid: 'PSID1',
				mid: 'm1',
				text: 'oi, tudo bem?',
				attachments: [],
				sentAt: new Date(1_760_000_000_000),
			},
		]);
	});

	it('keeps the files of a message, with their kind and address', () => {
		const [message] = parseMessengerWebhook(
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
		expect(message.attachments).toEqual([
			{ type: 'image', url: 'https://cdn.fbsbx.com/a.jpg' },
			{ type: 'audio', url: 'https://cdn.fbsbx.com/b.mp4' },
		]);
	});

	it('leaves out what has no address, such as a shared location', () => {
		const [message] = parseMessengerWebhook(
			body([
				event({
					mid: 'm3',
					text: 'aqui',
					attachments: [{ type: 'location', payload: { coordinates: {} } }],
				}),
			]),
		);

		expect(message.attachments).toEqual([]);
	});

	it('reads several events of several pages in one delivery', () => {
		const parsed = parseMessengerWebhook({
			object: 'page',
			entry: [
				{ id: 'PAGE1', messaging: [event({ mid: 'a', text: '1' })] },
				{
					id: 'PAGE2',
					messaging: [
						event({ mid: 'b', text: '2' }, { recipient: { id: 'PAGE2' } }),
						event({ mid: 'c', text: '3' }, { recipient: { id: 'PAGE2' } }),
					],
				},
			],
		});

		expect(parsed.map((m) => [m.pageId, m.mid])).toEqual([
			['PAGE1', 'a'],
			['PAGE2', 'b'],
			['PAGE2', 'c'],
		]);
	});

	it('ignores what is not a customer message: echoes, deliveries, reads and postbacks', () => {
		expect(
			parseMessengerWebhook(
				body([
					event({ mid: 'e', text: 'enviada por nós', is_echo: true }),
					event(undefined, { delivery: { mids: ['x'] } }),
					event(undefined, { read: { watermark: 1 } }),
					event(undefined, { postback: { payload: 'GET_STARTED' } }),
					event(
						{ mid: 'sent-by-page', text: 'x' },
						{ sender: { id: 'PAGE1' } },
					),
				]),
			),
		).toEqual([]);
	});

	it.each([
		null,
		undefined,
		'x',
		1,
		[],
		{},
		{ object: 'instagram', entry: [] },
		{ object: 'page' },
		body([null, 'x', {}]),
	])(
		'never throws and returns nothing for a body that is not a page event (%p)',
		(input) => {
			expect(parseMessengerWebhook(input as any)).toEqual([]);
		},
	);

	it('skips a message without an id, so nothing can be stored twice', () => {
		expect(parseMessengerWebhook(body([event({ text: 'sem mid' })]))).toEqual(
			[],
		);
	});
});
