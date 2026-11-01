import { parseWhatsappWebhook } from './whatsapp.update-parser';

const body = (messages: any[], over: any = {}): any => ({
	object: 'whatsapp_business_account',
	entry: [
		{
			id: 'WABA1',
			changes: [
				{
					field: 'messages',
					value: {
						messaging_product: 'whatsapp',
						metadata: {
							display_phone_number: '5585999990000',
							phone_number_id: 'PN1',
						},
						contacts: [{ profile: { name: 'Ana' }, wa_id: '5585988887777' }],
						messages,
						...over,
					},
				},
			],
		},
	],
});

const message = (over: any = {}): any => ({
	from: '5585988887777',
	id: 'wamid.1',
	timestamp: '1760000000',
	...over,
});

describe('parseWhatsappWebhook', () => {
	it('turns a text message into a storable one, with who wrote and the raw event', () => {
		const [parsed] = parseWhatsappWebhook(
			body([message({ type: 'text', text: { body: 'oi, tudo bem?' } })]),
		);

		expect(parsed).toMatchObject({
			phoneNumberId: 'PN1',
			waId: '5585988887777',
			profileName: 'Ana',
			mid: 'wamid.1',
			type: 'text',
			text: 'oi, tudo bem?',
			media: null,
			isUnsupported: false,
			sentAt: new Date(1_760_000_000_000),
		});
		expect(parsed.raw).toMatchObject({
			metadata: { phone_number_id: 'PN1' },
			contact: { wa_id: '5585988887777' },
			message: { id: 'wamid.1' },
		});
	});

	it('keeps the file of an image, a document and a voice note, with its caption', () => {
		const parsed = parseWhatsappWebhook(
			body([
				message({
					id: 'a',
					type: 'image',
					image: { id: 'M1', mime_type: 'image/jpeg', caption: 'olha' },
				}),
				message({
					id: 'b',
					type: 'document',
					document: {
						id: 'M2',
						mime_type: 'application/pdf',
						filename: 'a.pdf',
					},
				}),
				message({
					id: 'c',
					type: 'audio',
					audio: { id: 'M3', mime_type: 'audio/ogg; codecs=opus', voice: true },
				}),
			]),
		);

		expect(parsed[0]).toMatchObject({
			text: 'olha',
			media: {
				id: 'M1',
				mimeType: 'image/jpeg',
				fileName: null,
				isVoice: false,
			},
		});
		expect(parsed[1].media).toMatchObject({ id: 'M2', fileName: 'a.pdf' });
		expect(parsed[2].media).toMatchObject({ id: 'M3', isVoice: true });
		expect(parsed.every((item) => !item.isUnsupported)).toBe(true);
	});

	it('reads a location, a contact card and a button or list answer as text', () => {
		const parsed = parseWhatsappWebhook(
			body([
				message({
					id: 'l',
					type: 'location',
					location: { latitude: -3.7, longitude: -38.5, name: 'Loja' },
				}),
				message({
					id: 'c',
					type: 'contacts',
					contacts: [{ name: { formatted_name: 'Bia' } }],
				}),
				message({ id: 'b', type: 'button', button: { text: 'Sim' } }),
				message({
					id: 'i',
					type: 'interactive',
					interactive: { list_reply: { title: 'Opção 2' } },
				}),
			]),
		);

		expect(parsed.map((item) => item.text)).toEqual([
			'Loja · -3.7, -38.5',
			'Bia',
			'Sim',
			'Opção 2',
		]);
		expect(parsed.every((item) => !item.isUnsupported)).toBe(true);
	});

	it('flags what it cannot show as unsupported, and drops reactions', () => {
		const parsed = parseWhatsappWebhook(
			body([
				message({ id: 'u', type: 'order', order: {} }),
				message({ id: 'r', type: 'reaction', reaction: { emoji: '👍' } }),
			]),
		);

		expect(parsed).toHaveLength(1);
		expect(parsed[0]).toMatchObject({
			mid: 'u',
			isUnsupported: true,
			text: null,
		});
	});

	it('drops statuses, other fields, other objects and anything malformed, never throwing', () => {
		expect(parseWhatsappWebhook(null)).toEqual([]);
		expect(parseWhatsappWebhook({ object: 'page', entry: [] })).toEqual([]);
		expect(
			parseWhatsappWebhook({ object: 'whatsapp_business_account' }),
		).toEqual([]);

		const statuses: any = body([], {
			statuses: [{ id: 'wamid.1', status: 'read' }],
		});
		expect(parseWhatsappWebhook(statuses)).toEqual([]);

		const otherField: any = body([
			message({ type: 'text', text: { body: 'x' } }),
		]);
		otherField.entry[0].changes[0].field = 'account_update';
		expect(parseWhatsappWebhook(otherField)).toEqual([]);

		const noNumber: any = body([
			message({ type: 'text', text: { body: 'x' } }),
		]);
		delete noNumber.entry[0].changes[0].value.metadata;
		expect(parseWhatsappWebhook(noNumber)).toEqual([]);

		expect(
			parseWhatsappWebhook(
				body([{ type: 'text' }, 5, null, { id: 'x', from: '1' }]),
			),
		).toEqual([]);
	});

	it('takes the time now when the event has none', () => {
		const [parsed] = parseWhatsappWebhook(
			body([
				message({ type: 'text', text: { body: 'x' }, timestamp: undefined }),
			]),
		);

		expect(Math.abs(parsed.sentAt.getTime() - Date.now())).toBeLessThan(5000);
	});
});
