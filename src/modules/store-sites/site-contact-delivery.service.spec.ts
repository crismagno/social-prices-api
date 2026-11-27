import {
	isPublicAddress,
	SiteContactDeliveryService,
} from './site-contact-delivery.service';
import StoreSitesEnum from './interfaces/store-sites.enum';

jest.mock('dns/promises', () => ({ lookup: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { lookup } = require('dns/promises');

const Type = StoreSitesEnum.ContactFieldType;

const ANSWERS = [
	{ key: 'n', type: Type.NAME, label: 'Name', value: 'Ana <b>' },
	{ key: 'm', type: Type.TEXTAREA, label: 'Message', value: 'Oi\ntudo bem?' },
];

describe('isPublicAddress', () => {
	it.each([['8.8.8.8'], ['200.147.3.199'], ['2606:4700:4700::1111']])(
		'takes %p',
		(address) => {
			expect(isPublicAddress(address)).toBe(true);
		},
	);

	it.each([
		['127.0.0.1'],
		['10.1.2.3'],
		['172.16.0.1'],
		['172.31.255.255'],
		['192.168.1.10'],
		['169.254.169.254'],
		['100.64.0.1'],
		['0.0.0.0'],
		['224.0.0.1'],
		['::1'],
		['::'],
		['fd00::1'],
		['fe80::1'],
		['::ffff:10.0.0.1'],
		['::ffff:127.0.0.1'],
		['not-an-address'],
	])('refuses %p', (address) => {
		expect(isPublicAddress(address)).toBe(false);
	});
});

describe('SiteContactDeliveryService', () => {
	const build = (messageId: string | null = 'id-1') => {
		const emails = { sendEmail: jest.fn().mockResolvedValue(messageId) };

		return {
			emails,
			service: new SiteContactDeliveryService(emails as any),
		};
	};

	describe('email', () => {
		it('sends every answer, escaped, and answers go to who filled the form', async () => {
			const { service, emails } = build();

			await expect(
				service.email('dono@loja.com', 'Ateliê', ANSWERS, 'ana@mail.com'),
			).resolves.toBe(true);

			const sent = emails.sendEmail.mock.calls[0][0];

			expect(sent).toMatchObject({
				to: 'dono@loja.com',
				replyTo: 'ana@mail.com',
				text: 'Name: Ana <b>\nMessage: Oi\ntudo bem?',
			});
			expect(sent.subject).toContain('Ateliê');
			expect(sent.html).toContain('Ana &lt;b&gt;');
			expect(sent.html).toContain('Oi<br>tudo bem?');
			expect(sent.html).not.toContain('<b>');
		});

		it('keeps the subject and the reply address on one line', async () => {
			const { service, emails } = build();

			await service.email(
				'dono@loja.com',
				'Loja\r\nBcc: x@y.com',
				ANSWERS,
				'ana@mail.com\nBcc: z@y.com',
			);

			const sent = emails.sendEmail.mock.calls[0][0];

			expect(sent.subject).not.toMatch(/[\r\n]/);
			expect(sent.replyTo).not.toMatch(/[\r\n]/);
		});

		it('says it did not go when the e-mail could not be sent', async () => {
			const { service } = build(null);

			await expect(
				service.email('dono@loja.com', 'Ateliê', ANSWERS, null),
			).resolves.toBe(false);
		});
	});

	describe('webhook', () => {
		const PAYLOAD = {
			site: 'atelie',
			store: 'Ateliê',
			sentAt: '2026-11-27T12:00:00.000Z',
			fields: ANSWERS,
		};

		const fetchMock = jest.fn();

		beforeEach(() => {
			fetchMock.mockReset();
			lookup.mockReset();
			(global as any).fetch = fetchMock;
		});

		it('posts the answers as data to an address out on the internet', async () => {
			lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
			fetchMock.mockResolvedValue({ ok: true });

			const { service } = build();

			await expect(
				service.webhook('https://hooks.example.com/a', PAYLOAD),
			).resolves.toBe(true);

			const [url, init] = fetchMock.mock.calls[0];

			expect(url).toBe('https://hooks.example.com/a');
			expect(init).toMatchObject({ method: 'POST', redirect: 'error' });
			expect(JSON.parse(init.body)).toEqual(PAYLOAD);
		});

		it.each([
			[[{ address: '10.0.0.5', family: 4 }]],
			[[{ address: '169.254.169.254', family: 4 }]],
			[
				[
					{ address: '93.184.216.34', family: 4 },
					{ address: '127.0.0.1', family: 4 },
				],
			],
			[[]],
		])('calls nothing when the name points inside: %p', async (addresses) => {
			lookup.mockResolvedValue(addresses);

			const { service } = build();

			await expect(
				service.webhook('https://hooks.example.com/a', PAYLOAD),
			).resolves.toBe(false);
			expect(fetchMock).not.toHaveBeenCalled();
		});

		it('says it did not go when the address refuses, fails or redirects', async () => {
			lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);

			const { service } = build();

			fetchMock.mockResolvedValueOnce({ ok: false });
			await expect(
				service.webhook('https://hooks.example.com/a', PAYLOAD),
			).resolves.toBe(false);

			fetchMock.mockRejectedValueOnce(new Error('redirect'));
			await expect(
				service.webhook('https://hooks.example.com/a', PAYLOAD),
			).resolves.toBe(false);
		});
	});
});
