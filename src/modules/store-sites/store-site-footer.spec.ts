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

/** A footer already kept as items: only what its list says. */
const footerOf = (patch: any = {}) =>
	siteFooterOf({ itemsVersion: 2, ...patch });

const item = (patch: any = {}) => ({
	label: '',
	url: '',
	imageUrl: null,
	height: null,
	...patch,
});

describe('siteFooterOf', () => {
	it('shows the name and the way into the app for a site saved before the footer existed', () => {
		expect(siteFooterOf(undefined)).toMatchObject({
			isActive: true,
			// As it looked before sections existed: words on one side, links on the other.
			sections: [
				{ key: 'main', title: null },
				{ key: 'links', title: null },
			],
			links: [
				item({ key: 'legacy-name', type: Type.NAME, section: 'main' }),
				item({ key: 'legacy-sign-in', type: Type.SIGN_IN, section: 'main' }),
			],
			itemsVersion: 2,
		});
	});

	describe('a footer saved before its items had kinds', () => {
		it('reads its logo, name, text and sign-in into items, where they were', () => {
			const { links } = siteFooterOf({
				text: '  Feito com carinho em Fortaleza  ',
				isLogoVisible: true,
				logoUrl: ' footer-logo.png ',
				logoHeight: 72,
				sections: [
					{ key: 'a', title: null },
					{ key: 'b', title: null },
				],
				textSection: 'b',
				loginSection: 'a',
				links: [
					{
						key: 'i',
						type: Type.INSTAGRAM,
						url: 'instagram.com/a',
						section: 'a',
					},
				],
			});

			expect(links).toEqual([
				item({
					key: 'legacy-logo',
					type: Type.LOGO,
					section: 'b',
					imageUrl: 'footer-logo.png',
					height: 72,
				}),
				item({ key: 'legacy-name', type: Type.NAME, section: 'b' }),
				item({
					key: 'legacy-note',
					type: Type.NOTE,
					section: 'b',
					label: 'Feito com carinho em Fortaleza',
				}),
				item({
					key: 'i',
					type: Type.INSTAGRAM,
					url: 'https://instagram.com/a',
					section: 'a',
				}),
				item({ key: 'legacy-sign-in', type: Type.SIGN_IN, section: 'a' }),
			]);
		});

		it('leaves out the logo and the sign-in the owner had switched off', () => {
			const { links } = siteFooterOf({ isLoginVisible: false });

			expect(links.map((link) => link.type)).toEqual([Type.NAME]);
		});

		it('is read once: kept as items, its old fields say nothing more', () => {
			const first = siteFooterOf({ text: 'Oi', isLogoVisible: true });
			const again = siteFooterOf(first);

			expect(again.links).toEqual(first.links);
			expect(again).toMatchObject({
				text: null,
				isLoginVisible: false,
				isLogoVisible: false,
			});
		});
	});

	it('keeps what the owner chose', () => {
		expect(
			footerOf({
				isActive: false,
				links: [
					{
						key: 'a',
						type: Type.INSTAGRAM,
						label: ' @atelie ',
						url: 'instagram.com/atelie',
					},
				],
			}),
		).toMatchObject({
			isActive: false,
			links: [
				item({
					key: 'a',
					type: Type.INSTAGRAM,
					label: '@atelie',
					url: 'https://instagram.com/atelie',
					section: 'links',
				}),
			],
		});
	});

	it('drops a link that leads nowhere safe, and keeps the others', () => {
		const { links } = footerOf({
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
		const { links } = footerOf({
			links: [{ type: 'MYSPACE', label: 'Old', url: 'https://myspace.com/x' }],
		});

		expect(links[0].type).toBe(Type.WEBSITE);
		expect(links[0].key).toEqual(expect.any(String));
		expect(links[0].key.length).toBeGreaterThan(0);
	});

	it('takes a link of free text, to any address a page may link to', () => {
		const { links } = footerOf({
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
			item({
				key: 't',
				type: Type.TEXT,
				label: 'Política de trocas',
				url: 'https://loja.com/trocas',
				section: 'links',
			}),
		]);
	});

	it('keeps at most thirty items and trims long texts', () => {
		const many = Array.from({ length: 40 }, (_, index) => ({
			key: `k${index}`,
			type: Type.WEBSITE,
			label: 'L'.repeat(100),
			url: `https://site${index}.com`,
		}));

		const footer = footerOf({ links: many });

		expect(footer.links).toHaveLength(30);
		expect(footer.links[0].label).toHaveLength(40);
	});

	describe('items that are not links', () => {
		it('keeps a paragraph with its words, and drops an empty one', () => {
			const { links } = footerOf({
				links: [
					{
						key: 'n',
						type: Type.NOTE,
						label: ` ${'T'.repeat(900)} `,
						url: 'x.com',
					},
					{ key: 'e', type: Type.NOTE, label: '   ' },
				],
			});

			expect(links).toHaveLength(1);
			expect(links[0]).toMatchObject({ key: 'n', type: Type.NOTE, url: '' });
			expect(links[0].label).toHaveLength(300);
		});

		it('keeps an image with its picture, its height and where it leads when safe', () => {
			const { links } = footerOf({
				links: [
					{
						key: 'a',
						type: Type.IMAGE,
						imageUrl: ' selo.png ',
						height: 999,
						url: 'selo.com',
					},
					{
						key: 'b',
						type: Type.IMAGE,
						imageUrl: 'pix.png',
						url: 'javascript:alert(1)',
					},
					{ key: 'c', type: Type.IMAGE, imageUrl: '' },
				],
			});

			expect(links).toEqual([
				item({
					key: 'a',
					type: Type.IMAGE,
					imageUrl: 'selo.png',
					height: 240,
					url: 'https://selo.com',
					section: 'links',
				}),
				item({
					key: 'b',
					type: Type.IMAGE,
					imageUrl: 'pix.png',
					height: 80,
					section: 'links',
				}),
			]);
		});

		it('keeps a logo with a picture of its own or none (the site logo), within its height', () => {
			const { links } = footerOf({
				links: [
					{ key: 'a', type: Type.LOGO, imageUrl: '  ', height: 5 },
					{ key: 'b', type: Type.LOGO, imageUrl: 'own.png', height: 63.6 },
				],
			});

			expect(links.map((link) => [link.imageUrl, link.height])).toEqual([
				[null, 20],
				['own.png', 64],
			]);
		});

		it('keeps the name (with words of the owner or not) and the sign-in as many times as wanted', () => {
			const { links } = footerOf({
				links: [
					{ key: 'a', type: Type.NAME, label: ' Ateliê ', url: 'x.com' },
					{ key: 'b', type: Type.SIGN_IN, label: 'ignored' },
					{ key: 'c', type: Type.SIGN_IN },
				],
			});

			expect(links).toEqual([
				item({ key: 'a', type: Type.NAME, label: 'Ateliê', section: 'links' }),
				item({ key: 'b', type: Type.SIGN_IN, section: 'links' }),
				item({ key: 'c', type: Type.SIGN_IN, section: 'links' }),
			]);
		});
	});

	describe('sections', () => {
		const three = [
			{ key: 'a', title: ' Sobre ' },
			{ key: 'b', title: '' },
			{ key: 'c', title: 'Redes' },
		];

		it('keeps the sections chosen and where each thing was put', () => {
			const footer = footerOf({
				sections: three,
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
			expect(footer.links.map((link) => link.section)).toEqual(['c', 'b']);
		});

		it('puts in the first section whatever points to one that is gone', () => {
			const footer = footerOf({
				sections: three,
				links: [
					{
						key: 'i',
						type: Type.INSTAGRAM,
						label: '',
						url: 'instagram.com/a',
						section: 'x',
					},
					{ key: 's', type: Type.SIGN_IN, section: null },
				],
			});

			expect(footer.links.map((link) => link.section)).toEqual(['a', 'a']);
		});

		it('keeps at most five, drops repeated or nameless ones, trims titles', () => {
			const footer = footerOf({
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
			expect(footerOf({ sections: [] }).sections).toHaveLength(2);
			expect(footerOf({ sections: 'x' }).sections).toHaveLength(2);
		});
	});

	it('survives garbage', () => {
		expect(footerOf({ links: 'x' }).links).toEqual([]);
		expect(siteFooterOf('x' as any).links.map((link) => link.type)).toEqual([
			Type.NAME,
			Type.SIGN_IN,
		]);
	});
});
