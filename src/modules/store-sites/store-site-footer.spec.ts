import StoreSitesEnum from './interfaces/store-sites.enum';
import { safeFooterUrl, siteFooterOf } from './store-site-footer';

const Type = StoreSitesEnum.FooterLinkType;

describe('safeFooterUrl', () => {
	it('keeps a web address and completes one typed without https', () => {
		expect(safeFooterUrl(Type.WEBSITE, 'https://loja.com/a?b=1')).toBe(
			'https://loja.com/a?b=1',
		);
		expect(safeFooterUrl(Type.INSTAGRAM, 'instagram.com/atelie')).toBe(
			'https://instagram.com/atelie',
		);
	});

	it('turns an email and a phone into links that open the right app', () => {
		expect(safeFooterUrl(Type.EMAIL, ' Oi@Loja.com ')).toBe(
			'mailto:oi@loja.com',
		);
		expect(safeFooterUrl(Type.PHONE, '(85) 99999-0000')).toBe(
			'tel:85999990000',
		);
		expect(safeFooterUrl(Type.PHONE, '+55 85 99999-0000')).toBe(
			'tel:+5585999990000',
		);
	});

	it('turns a WhatsApp number into its chat link, and keeps a link as it is', () => {
		expect(safeFooterUrl(Type.WHATSAPP, '+55 (85) 99999-0000')).toBe(
			'https://wa.me/5585999990000',
		);
		expect(safeFooterUrl(Type.WHATSAPP, 'https://wa.me/5585999990000')).toBe(
			'https://wa.me/5585999990000',
		);
	});

	it.each([
		'javascript:alert(1)',
		' JavaScript:alert(1)',
		'data:text/html,<script>alert(1)</script>',
		'vbscript:x',
		'file:///etc/passwd',
		'',
		'   ',
		'http://',
	])('refuses %p', (url) => {
		expect(safeFooterUrl(Type.WEBSITE, url)).toBeNull();
	});

	it('refuses an email or a phone that is not one', () => {
		expect(safeFooterUrl(Type.EMAIL, 'not an email')).toBeNull();
		expect(safeFooterUrl(Type.PHONE, 'call me')).toBeNull();
	});

	it('refuses an address too long to be one', () => {
		expect(
			safeFooterUrl(Type.WEBSITE, `https://x.com/${'a'.repeat(400)}`),
		).toBeNull();
	});
});

describe('siteFooterOf', () => {
	it('shows a footer with the login button for a site saved before it existed', () => {
		expect(siteFooterOf(undefined)).toEqual({
			isActive: true,
			text: null,
			isLoginVisible: true,
			// As it looked before sections existed: words on one side, links on the other.
			sections: [
				{ key: 'main', title: null },
				{ key: 'links', title: null },
			],
			textSection: 'main',
			loginSection: 'main',
			links: [],
		});
	});

	it('keeps what the owner chose', () => {
		expect(
			siteFooterOf({
				isActive: false,
				text: '  Feito com carinho em Fortaleza  ',
				isLoginVisible: false,
				links: [
					{
						key: 'a',
						type: Type.INSTAGRAM,
						label: ' @atelie ',
						url: 'instagram.com/atelie',
					},
				],
			}),
		).toEqual({
			isActive: false,
			text: 'Feito com carinho em Fortaleza',
			isLoginVisible: false,
			sections: [
				{ key: 'main', title: null },
				{ key: 'links', title: null },
			],
			textSection: 'main',
			loginSection: 'main',
			links: [
				{
					key: 'a',
					type: Type.INSTAGRAM,
					label: '@atelie',
					url: 'https://instagram.com/atelie',
					section: 'links',
				},
			],
		});
	});

	it('drops a link that leads nowhere safe, and keeps the others', () => {
		const { links } = siteFooterOf({
			links: [
				{
					key: 'bad',
					type: Type.WEBSITE,
					label: 'x',
					url: 'javascript:alert(1)',
				},
				{
					key: 'ok',
					type: Type.WEBSITE,
					label: 'Blog',
					url: 'https://blog.com',
				},
				'nonsense',
				null,
			],
		});

		expect(links.map((link) => link.key)).toEqual(['ok']);
	});

	it('treats an unknown kind of link as a plain site, and gives a key to one without', () => {
		const { links } = siteFooterOf({
			links: [{ type: 'MYSPACE', label: 'Old', url: 'https://myspace.com/x' }],
		});

		expect(links[0].type).toBe(Type.WEBSITE);
		expect(links[0].key).toEqual(expect.any(String));
		expect(links[0].key.length).toBeGreaterThan(0);
	});

	it('takes a link of free text, to any address a page may link to', () => {
		const { links } = siteFooterOf({
			links: [
				{
					key: 't',
					type: Type.TEXT,
					label: 'Política de trocas',
					url: 'loja.com/trocas',
				},
				{ key: 'j', type: Type.TEXT, label: 'x', url: 'javascript:alert(1)' },
			],
		});

		expect(links).toEqual([
			{
				key: 't',
				type: Type.TEXT,
				label: 'Política de trocas',
				url: 'https://loja.com/trocas',
				section: 'links',
			},
		]);
	});

	it('keeps at most twelve links and trims long texts', () => {
		const many = Array.from({ length: 30 }, (_, index) => ({
			key: `k${index}`,
			type: Type.WEBSITE,
			label: 'L'.repeat(100),
			url: `https://site${index}.com`,
		}));

		const footer = siteFooterOf({ text: 'T'.repeat(900), links: many });

		expect(footer.links).toHaveLength(12);
		expect(footer.links[0].label).toHaveLength(40);
		expect(footer.text).toHaveLength(300);
	});

	describe('sections', () => {
		const three = [
			{ key: 'a', title: ' Sobre ' },
			{ key: 'b', title: '' },
			{ key: 'c', title: 'Redes' },
		];

		it('keeps the sections chosen and where each thing was put', () => {
			const footer = siteFooterOf({
				sections: three,
				textSection: 'a',
				loginSection: 'c',
				links: [
					{
						key: 'i',
						type: Type.INSTAGRAM,
						label: '',
						url: 'instagram.com/a',
						section: 'c',
					},
					{
						key: 'w',
						type: Type.WEBSITE,
						label: '',
						url: 'blog.com',
						section: 'b',
					},
				],
			});

			expect(footer.sections).toEqual([
				{ key: 'a', title: 'Sobre' },
				{ key: 'b', title: null },
				{ key: 'c', title: 'Redes' },
			]);
			expect(footer.textSection).toBe('a');
			expect(footer.loginSection).toBe('c');
			expect(footer.links.map((link) => link.section)).toEqual(['c', 'b']);
		});

		it('puts in the first section whatever points to one that is gone', () => {
			const footer = siteFooterOf({
				sections: three,
				textSection: 'removed',
				loginSection: null,
				links: [
					{
						key: 'i',
						type: Type.INSTAGRAM,
						label: '',
						url: 'instagram.com/a',
						section: 'x',
					},
				],
			});

			expect(footer.textSection).toBe('a');
			expect(footer.loginSection).toBe('a');
			expect(footer.links[0].section).toBe('a');
		});

		it('keeps at most five, drops repeated or nameless ones, trims titles', () => {
			const footer = siteFooterOf({
				sections: [
					{ key: 'a', title: 'T'.repeat(90) },
					{ key: 'a', title: 'again' },
					{ title: 'no key' },
					'junk',
					...['b', 'c', 'd', 'e', 'f', 'g'].map((key) => ({
						key,
						title: null,
					})),
				],
			});

			expect(footer.sections.map((section) => section.key)).toEqual([
				'a',
				'b',
				'c',
				'd',
				'e',
			]);
			expect(footer.sections[0].title).toHaveLength(40);
		});

		it('goes back to the default two when none is left', () => {
			expect(siteFooterOf({ sections: [] }).sections).toHaveLength(2);
			expect(siteFooterOf({ sections: 'x' } as any).sections).toHaveLength(2);
		});
	});

	it('survives garbage', () => {
		expect(siteFooterOf('x' as any).links).toEqual([]);
		expect(siteFooterOf({ links: 'x' } as any).links).toEqual([]);
	});
});
