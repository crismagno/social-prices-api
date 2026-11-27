import StoreSitesEnum from './interfaces/store-sites.enum';
import {
	contactAnswersOf,
	ContactAnswerError,
	contactDestinationOf,
	contactIdentityOf,
	contactMessageOf,
	publicContactFormOf,
	safeWebhookUrl,
	siteContactFormOf,
	USUAL_CONTACT_KEYS,
} from './store-site-contact';

const Type = StoreSitesEnum.ContactFieldType;
const Destination = StoreSitesEnum.ContactDestination;
const K = USUAL_CONTACT_KEYS;

describe('siteContactFormOf', () => {
	it('asks what the form always asked, for the inbox, on a page saved before it could change', () => {
		const form = siteContactFormOf(undefined);

		expect(form).toMatchObject({
			title: null,
			buttonLabel: null,
			successMessage: null,
			destination: Destination.INBOX,
			email: null,
			whatsapp: null,
			webhookUrl: null,
		});
		expect(
			form.fields.map((asked) => [asked.key, asked.type, asked.isRequired]),
		).toEqual([
			[K.name, Type.NAME, true],
			[K.email, Type.EMAIL, true],
			[K.phone, Type.PHONE, false],
			[K.message, Type.TEXTAREA, true],
		]);
	});

	it('keeps the fields, words and destination of the owner', () => {
		const form = siteContactFormOf({
			title: ' Peça um orçamento ',
			buttonLabel: ' Enviar pedido ',
			successMessage: ' Recebemos! ',
			destination: Destination.EMAIL,
			email: ' Vendas@Loja.com ',
			fields: [
				{ key: 'nome', type: Type.NAME, label: ' Seu nome ', isRequired: true },
				{
					key: 'tipo',
					type: Type.SELECT,
					label: 'Tipo',
					options: ['Bolo', ' Bolo ', 'Doces', ''],
				},
			],
		});

		expect(form).toMatchObject({
			title: 'Peça um orçamento',
			buttonLabel: 'Enviar pedido',
			successMessage: 'Recebemos!',
			destination: Destination.EMAIL,
			email: 'vendas@loja.com',
		});
		expect(form.fields).toEqual([
			{
				key: 'nome',
				type: Type.NAME,
				label: 'Seu nome',
				placeholder: null,
				isRequired: true,
				options: [],
			},
			{
				key: 'tipo',
				type: Type.SELECT,
				label: 'Tipo',
				placeholder: null,
				isRequired: false,
				options: ['Bolo', 'Doces'],
			},
		]);
	});

	it('drops what is not a field, a choice with no options, and gives each a key of its own', () => {
		const { fields } = siteContactFormOf({
			fields: [
				{ type: 'FILE' },
				'x',
				{ type: Type.SELECT, options: [] },
				{ key: 'a', type: Type.TEXT },
				{ key: 'a', type: Type.TEXT },
				{ key: 'Not A Key!', type: Type.TEXT },
			],
		});

		expect(fields).toHaveLength(3);
		expect(fields[0].key).toBe('a');
		expect(new Set(fields.map((asked) => asked.key)).size).toBe(3);
		expect(fields[2].key).toMatch(/^f-[0-9a-f]{8}$/);
	});

	it('asks the usual when every field was dropped, and at most twelve', () => {
		expect(siteContactFormOf({ fields: [] }).fields).toHaveLength(4);
		expect(
			siteContactFormOf({
				fields: Array.from({ length: 20 }, () => ({ type: Type.TEXT })),
			}).fields,
		).toHaveLength(12);
	});

	it('keeps only addresses that can be one', () => {
		expect(
			siteContactFormOf({
				email: 'not-an-email',
				whatsapp: '12',
				webhookUrl: 'http://example.com/hook',
			}),
		).toMatchObject({ email: null, whatsapp: null, webhookUrl: null });
		expect(
			siteContactFormOf({ whatsapp: '+55 (85) 99999-0000' }).whatsapp,
		).toBe('5585999990000');
	});
});

describe('safeWebhookUrl', () => {
	it('takes an https address with a public name', () => {
		expect(safeWebhookUrl(' https://hooks.example.com/a?b=1 ')).toBe(
			'https://hooks.example.com/a?b=1',
		);
	});

	it.each([
		['http://hooks.example.com/a'],
		['ftp://hooks.example.com/a'],
		['https://localhost/a'],
		['https://api.localhost/a'],
		['https://printer.local/a'],
		['https://db.internal/a'],
		['https://127.0.0.1/a'],
		['https://10.0.0.5/a'],
		['https://169.254.169.254/latest/meta-data'],
		['https://[::1]/a'],
		['https://intranet/a'],
		['https://user:pass@hooks.example.com/a'],
		['javascript:alert(1)'],
		['not a url'],
		[''],
		[42],
	])('refuses %p', (value) => {
		expect(safeWebhookUrl(value)).toBeNull();
	});
});

describe('contactDestinationOf and publicContactFormOf', () => {
	it('goes to the inbox until the address the destination needs is given', () => {
		for (const destination of [
			Destination.EMAIL,
			Destination.WHATSAPP,
			Destination.WEBHOOK,
		]) {
			expect(contactDestinationOf(siteContactFormOf({ destination }))).toBe(
				Destination.INBOX,
			);
		}

		expect(
			contactDestinationOf(
				siteContactFormOf({
					destination: Destination.WEBHOOK,
					webhookUrl: 'https://hooks.example.com/a',
				}),
			),
		).toBe(Destination.WEBHOOK);
	});

	it('never carries the e-mail or the webhook to the public site', () => {
		const shown = publicContactFormOf(
			siteContactFormOf({
				destination: Destination.EMAIL,
				email: 'dono@loja.com',
				webhookUrl: 'https://hooks.example.com/secret',
				whatsapp: '5585999990000',
			}),
		);

		const json = JSON.stringify(shown);

		expect(shown.destination).toBe(Destination.EMAIL);
		expect(json).not.toContain('dono@loja.com');
		expect(json).not.toContain('hooks.example.com');
		expect(json).not.toContain('webhookUrl');
		// Not opening WhatsApp: its number stays with the owner too.
		expect(shown.whatsapp).toBeNull();
	});

	it('carries the number of WhatsApp when the form opens it', () => {
		expect(
			publicContactFormOf(
				siteContactFormOf({
					destination: Destination.WHATSAPP,
					whatsapp: '5585999990000',
				}),
			),
		).toMatchObject({
			destination: Destination.WHATSAPP,
			whatsapp: '5585999990000',
		});
	});
});

describe('contactAnswersOf', () => {
	const form = siteContactFormOf({
		fields: [
			{ key: 'nome', type: Type.NAME, isRequired: true },
			{ key: 'mail', type: Type.EMAIL, label: 'Seu e-mail' },
			{ key: 'fone', type: Type.PHONE },
			{ key: 'tipo', type: Type.SELECT, options: ['Bolo', 'Doces'] },
			{ key: 'obs', type: Type.TEXTAREA, label: 'Observações' },
		],
	});

	const failing = (sent: Record<string, unknown>): string => {
		try {
			contactAnswersOf(form, sent);
		} catch (error) {
			return (error as ContactAnswerError).field;
		}

		return 'none';
	};

	it('takes each answer the form asks, trimmed, named, and nothing else', () => {
		expect(
			contactAnswersOf(form, {
				nome: '  Ana ',
				mail: ' ANA@Mail.com ',
				tipo: 'Doces',
				obs: 'Para sábado',
				other: 'ignored',
			}),
		).toEqual([
			{ key: 'nome', type: Type.NAME, label: 'Name', value: 'Ana' },
			{
				key: 'mail',
				type: Type.EMAIL,
				label: 'Seu e-mail',
				value: 'ana@mail.com',
			},
			{ key: 'tipo', type: Type.SELECT, label: 'Choice', value: 'Doces' },
			{
				key: 'obs',
				type: Type.TEXTAREA,
				label: 'Observações',
				value: 'Para sábado',
			},
		]);
	});

	it('says which field is wrong', () => {
		expect(failing({})).toBe('nome');
		expect(failing({ nome: 'Ana', mail: 'ana@' })).toBe('mail');
		expect(failing({ nome: 'Ana', fone: '12' })).toBe('fone');
		expect(failing({ nome: 'Ana', tipo: 'Pizza' })).toBe('tipo');
		expect(failing({ nome: 'Ana', obs: 'a'.repeat(2001) })).toBe('obs');
		expect(failing({ nome: 42 })).toBe('nome');
	});

	it('finds who wrote and says the rest as a message', () => {
		const answers = contactAnswersOf(form, {
			nome: 'Ana',
			mail: 'ana@mail.com',
			fone: '85 99999-0000',
			tipo: 'Bolo',
			obs: 'Para sábado',
		});

		expect(contactIdentityOf(answers)).toEqual({
			name: 'Ana',
			email: 'ana@mail.com',
			phone: '85 99999-0000',
		});
		expect(contactMessageOf(answers)).toBe(
			'Choice: Bolo\nObservações: Para sábado',
		);
	});

	it('says a single thing plainly, and everything when only who wrote was asked', () => {
		expect(
			contactMessageOf(
				contactAnswersOf(form, { nome: 'Ana', obs: 'Vocês entregam?' }),
			),
		).toBe('Vocês entregam?');
		expect(contactMessageOf(contactAnswersOf(form, { nome: 'Ana' }))).toBe(
			'Name: Ana',
		);
	});
});
