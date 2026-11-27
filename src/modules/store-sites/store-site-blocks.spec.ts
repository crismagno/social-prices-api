import StoreSitesEnum from './interfaces/store-sites.enum';
import {
	blockButtonHref,
	publicBlocksOf,
	siteBlocksOf,
} from './store-site-blocks';
import { embedUrlOf } from './store-site-about';

const KEY = /^[a-z0-9-]{1,40}$/;

const block = (patch: any = {}) => ({
	key: 'b1',
	type: StoreSitesEnum.BlockType.FEATURES,
	isActive: true,
	pageKey: null,
	title: 'Diferenciais',
	items: [{ key: 'i1', title: 'Rápido', text: 'Entrega em 1 dia' }],
	...patch,
});

describe('siteBlocksOf', () => {
	it('is empty for anything that is not a list', () => {
		expect(siteBlocksOf(undefined)).toEqual([]);
		expect(siteBlocksOf({})).toEqual([]);
		expect(siteBlocksOf('x')).toEqual([]);
	});

	it('keeps a testimonial block as the owner wrote it, trimmed', () => {
		const [kept] = siteBlocksOf([
			block({
				type: StoreSitesEnum.BlockType.TESTIMONIALS,
				kicker: ' Clientes ',
				title: ' O que dizem ',
				subtitle: ' De verdade ',
				items: [
					{
						key: 'i1',
						text: ' Amei! ',
						title: 'Ana',
						subtitle: 'São Paulo',
						imageUrl: ' ana.png ',
						rating: 5,
						icon: StoreSitesEnum.FeatureIcon.STAR,
					},
				],
			}),
		]);

		expect(kept).toEqual({
			key: 'b1',
			type: StoreSitesEnum.BlockType.TESTIMONIALS,
			isActive: true,
			pageKey: null,
			kicker: 'Clientes',
			title: 'O que dizem',
			subtitle: 'De verdade',
			items: [
				{
					key: 'i1',
					sectionKey: null,
					title: 'Ana',
					subtitle: 'São Paulo',
					text: 'Amei!',
					imageUrl: 'ana.png',
					icon: null,
					rating: 5,
					button: null,
				},
			],
			button: null,
			buttons: [],
			settings: {
				align: null,
				width: null,
				tone: null,
				height: null,
				divider: null,
				media: null,
				menuStyle: null,
				menuMode: null,
				menuSide: null,
				menuLook: null,
				menuEffect: null,
			},
		});
	});

	it('keeps the icon of a feature only from the ready list', () => {
		const [kept] = siteBlocksOf([
			block({
				items: [
					{ title: 'A', icon: StoreSitesEnum.FeatureIcon.ROCKET },
					{ title: 'B', icon: 'DRAGON' },
				],
			}),
		]);

		expect(kept.items.map((item) => item.icon)).toEqual([
			StoreSitesEnum.FeatureIcon.ROCKET,
			StoreSitesEnum.FeatureIcon.STAR,
		]);
		expect(kept.items[0].rating).toBeNull();
	});

	it('drops unknown types and items with nothing for their type', () => {
		const kept = siteBlocksOf([
			block({ key: 'g', type: 'GALLERY' }),
			block({
				key: 't',
				type: StoreSitesEnum.BlockType.TESTIMONIALS,
				items: [{ title: 'Sem frase' }, { text: 'Ótimo' }],
			}),
			block({
				key: 'l',
				type: StoreSitesEnum.BlockType.LOGOS,
				items: [
					{ subtitle: 'nada' },
					{ title: 'Figma' },
					{ imageUrl: 'x.png' },
				],
			}),
		]);

		expect(kept.map((each) => each.key)).toEqual(['t', 'l']);
		expect(kept[0].items.map((item) => item.text)).toEqual(['Ótimo']);
		expect(kept[1].items).toHaveLength(2);
	});

	it('cuts to 20 blocks and 12 items, 20 for the FAQ', () => {
		const many = (count: number) =>
			Array.from({ length: count }, (_, index: number) => ({
				title: `Q${index}`,
				text: `A${index}`,
			}));

		expect(
			siteBlocksOf(
				Array.from({ length: 70 }, (_, index: number) =>
					block({ key: `b${index}` }),
				),
			),
		).toHaveLength(StoreSitesEnum.MAX_BLOCKS);

		const [features, faq] = siteBlocksOf([
			block({ key: 'f', items: many(30) }),
			block({
				key: 'q',
				type: StoreSitesEnum.BlockType.FAQ,
				items: many(30),
			}),
		]);

		expect(features.items).toHaveLength(12);
		expect(faq.items).toHaveLength(20);
	});

	it('clamps the rating and defaults it to 5', () => {
		const [kept] = siteBlocksOf([
			block({
				type: StoreSitesEnum.BlockType.TESTIMONIALS,
				items: [
					{ text: 'a', rating: 9 },
					{ text: 'b', rating: 0 },
					{ text: 'c' },
					{ text: 'd', rating: 3.6 },
				],
			}),
		]);

		expect(kept.items.map((item) => item.rating)).toEqual([5, 1, 5, 4]);
	});

	it('cuts texts to their lengths', () => {
		const [kept] = siteBlocksOf([
			block({
				kicker: 'k'.repeat(50),
				title: 't'.repeat(200),
				subtitle: 's'.repeat(400),
				items: [
					{
						title: 'a'.repeat(90),
						subtitle: 'b'.repeat(90),
						text: 'c'.repeat(700),
					},
				],
			}),
		]);

		expect(kept.kicker).toHaveLength(40);
		expect(kept.title).toHaveLength(120);
		expect(kept.subtitle).toHaveLength(300);
		expect(kept.items[0].title).toHaveLength(80);
		expect(kept.items[0].subtitle).toHaveLength(80);
		expect(kept.items[0].text).toHaveLength(600);
	});

	it('gives each block and item a key when it has none or a bad one', () => {
		const kept = siteBlocksOf([
			block({ key: 'Bad Key!', items: [{ title: 'x' }] }),
			block({ key: 'same' }),
			block({ key: 'same' }),
		]);

		expect(kept[0].key).toMatch(KEY);
		expect(kept[0].key).not.toBe('Bad Key!');
		expect(kept[0].items[0].key).toMatch(KEY);
		expect(kept[1].key).toBe('same');
		expect(kept[2].key).toMatch(KEY);
		expect(kept[2].key).not.toBe('same');
	});

	it('keeps the button only on a call to action', () => {
		const button = {
			label: ' Fale ',
			target: StoreSitesEnum.BlockButtonTarget.WHATSAPP,
			value: ' 11 99999-0000 ',
		};

		const [features, cta] = siteBlocksOf([
			block({ key: 'f', button }),
			block({
				key: 'c',
				type: StoreSitesEnum.BlockType.CTA,
				items: [{ title: 'ignored' }],
				button,
			}),
		]);

		expect(features.button).toBeNull();
		expect(cta.items).toEqual([]);
		expect(cta.button).toEqual({
			label: 'Fale',
			target: StoreSitesEnum.BlockButtonTarget.WHATSAPP,
			pageKey: null,
			value: '11 99999-0000',
			variant: StoreSitesEnum.ButtonVariant.PRIMARY,
		});
	});

	it('gives a call to action a button to the home when it has none', () => {
		const [cta] = siteBlocksOf([
			block({ type: StoreSitesEnum.BlockType.CTA, items: [] }),
		]);

		expect(cta.button).toEqual({
			label: null,
			target: StoreSitesEnum.BlockButtonTarget.PAGE,
			pageKey: null,
			value: null,
			variant: StoreSitesEnum.ButtonVariant.PRIMARY,
		});
	});
});

describe('publicBlocksOf', () => {
	it('shows only active blocks of existing pages, with content', () => {
		const shown = publicBlocksOf(
			[
				block({ key: 'off', isActive: false }),
				block({ key: 'gone', pageKey: 'gone' }),
				block({ key: 'page', pageKey: 'p1' }),
				block({ key: 'home' }),
				block({
					key: 'empty',
					type: StoreSitesEnum.BlockType.FAQ,
					title: null,
					items: [],
				}),
				block({
					key: 'cta',
					type: StoreSitesEnum.BlockType.CTA,
					title: 'Vamos conversar?',
					items: [],
				}),
			],
			['p1'],
		);

		expect(shown.map((each) => each.key)).toEqual(['page', 'home', 'cta']);
	});

	it.each([
		[
			'a script address',
			StoreSitesEnum.BlockButtonTarget.URL,
			'javascript:alert(1)',
			null,
		],
		[
			'letters for WhatsApp',
			StoreSitesEnum.BlockButtonTarget.WHATSAPP,
			'abc',
			null,
		],
		[
			'a page that is gone',
			StoreSitesEnum.BlockButtonTarget.PAGE,
			null,
			'gone',
		],
	])(
		'removes the button of a call to action with %s',
		(_label, target, value, pageKey) => {
			const [cta] = publicBlocksOf(
				[
					block({
						type: StoreSitesEnum.BlockType.CTA,
						title: 'Vamos?',
						button: { label: 'Ir', target, value, pageKey },
					}),
				],
				['p1'],
			);

			expect(cta.title).toBe('Vamos?');
			expect(cta.button).toBeNull();
		},
	);

	it('keeps the button of a call to action to an existing page', () => {
		const [cta] = publicBlocksOf(
			[
				block({
					type: StoreSitesEnum.BlockType.CTA,
					button: {
						label: 'Ver',
						target: StoreSitesEnum.BlockButtonTarget.PAGE,
						pageKey: 'p1',
					},
				}),
			],
			['p1'],
		);

		expect(cta.button).toMatchObject({ pageKey: 'p1' });
	});
});

describe('blockButtonHref', () => {
	it('makes the address of each kind of target', () => {
		const of = (target: StoreSitesEnum.BlockButtonTarget, value: string) =>
			blockButtonHref(
				{
					label: null,
					target,
					pageKey: null,
					value,
					variant: StoreSitesEnum.ButtonVariant.PRIMARY,
				},
				[],
			);

		expect(
			of(StoreSitesEnum.BlockButtonTarget.WHATSAPP, '+55 11 99999-0000'),
		).toBe('https://wa.me/5511999990000');
		expect(of(StoreSitesEnum.BlockButtonTarget.PHONE, '11 3333-4444')).toMatch(
			/^tel:/,
		);
		expect(of(StoreSitesEnum.BlockButtonTarget.EMAIL, 'oi@loja.com')).toBe(
			'mailto:oi@loja.com',
		);
		expect(of(StoreSitesEnum.BlockButtonTarget.URL, 'loja.com')).toBe(
			'https://loja.com',
		);
	});

	it('says a page target is fine only when the page exists, or is the home', () => {
		const page = (pageKey: string | null) =>
			blockButtonHref(
				{
					label: null,
					target: StoreSitesEnum.BlockButtonTarget.PAGE,
					pageKey,
					value: null,
					variant: StoreSitesEnum.ButtonVariant.PRIMARY,
				},
				['p1'],
			);

		expect(page(null)).toBe('');
		expect(page('p1')).toBe('');
		expect(page('gone')).toBeNull();
	});
});

describe('sections of the page builder', () => {
	const T = StoreSitesEnum.BlockType;

	const section = (patch: any = {}) => ({
		type: T.TEXT,
		isActive: true,
		pageKey: null,
		title: 'Oi',
		...patch,
	});

	it('keeps the parts of the site, once per page, and never the page body on the home', () => {
		const kept = siteBlocksOf([
			section({ type: T.PRODUCTS }),
			section({ type: T.PRODUCTS }),
			section({ type: T.PAGE_BODY }),
			section({ type: T.ABOUT }),
			section({ type: T.PRODUCTS, pageKey: 'p1' }),
			section({ type: T.PAGE_BODY, pageKey: 'p1' }),
		]);

		expect(
			kept.filter((each) => each.pageKey === null).map((each) => each.type),
		).toEqual([T.PRODUCTS, T.ABOUT]);
		expect(
			kept.filter((each) => each.pageKey === 'p1').map((each) => each.type),
		).toEqual([T.PRODUCTS, T.PAGE_BODY]);
	});

	it('gives parts no content of their own', () => {
		const [part] = siteBlocksOf([
			section({
				type: T.PRODUCTS,
				title: 'x',
				items: [{ title: 'y' }],
				buttons: [{ label: 'z' }],
			}),
		]);

		expect(part).toMatchObject({
			title: null,
			items: [],
			buttons: [],
			button: null,
		});
	});

	it('keeps a text piece with its alignment and tone', () => {
		const [text] = siteBlocksOf([
			section({
				subtitle: 'Linha 1\nLinha 2',
				settings: { align: 'CENTER', tone: 'SOFT', height: 99 },
			}),
		]);

		expect(text.subtitle).toBe('Linha 1\nLinha 2');
		expect(text.settings).toEqual({
			align: 'CENTER',
			width: null,
			tone: 'SOFT',
			height: null,
			divider: null,
			media: null,
			menuStyle: null,
			menuMode: null,
			menuSide: null,
			menuLook: null,
			menuEffect: null,
		});
	});

	it('keeps 1 to 3 buttons, each with its variant', () => {
		const [buttons] = siteBlocksOf([
			section({
				type: T.BUTTONS,
				buttons: Array.from({ length: 5 }, (_, index: number) => ({
					label: `B${index}`,
					target: StoreSitesEnum.BlockButtonTarget.URL,
					value: 'loja.com',
					variant: index === 1 ? 'GHOST' : 'OUTLINE',
				})),
			}),
		]);

		expect(buttons.buttons).toHaveLength(3);
		expect(buttons.buttons.map((each) => each.variant)).toEqual([
			'OUTLINE',
			'PRIMARY',
			'OUTLINE',
		]);
	});

	it.each([
		[2, 8],
		[999, 240],
		[undefined, 48],
	])('clamps the spacer between 8 and 240: %p gives %p', (height, kept) => {
		const [spacer] = siteBlocksOf([
			section({ type: T.SPACER, settings: { height } }),
		]);

		expect(spacer.settings.height).toBe(kept);
	});

	it('keeps a video only from an upload or a YouTube/Vimeo player', () => {
		const videoOf = (media: unknown) =>
			siteBlocksOf([section({ type: T.VIDEO, settings: { media } })])[0];

		expect(
			videoOf({ type: 'EMBED', url: 'https://youtu.be/abc12345678' }).settings
				.media,
		).toEqual({
			type: StoreSitesEnum.AboutMediaType.EMBED,
			url: embedUrlOf('https://youtu.be/abc12345678'),
		});
		expect(
			videoOf({ type: 'EMBED', url: 'https://evil.com/x' }).settings.media,
		).toBeNull();
		expect(videoOf({ type: 'VIDEO', url: ' key.mp4 ' }).settings.media).toEqual(
			{
				type: StoreSitesEnum.AboutMediaType.VIDEO,
				url: 'key.mp4',
			},
		);
	});

	it('keeps a box of 1 to 3 columns, each with its button', () => {
		const [box] = siteBlocksOf([
			section({
				type: T.BOX,
				items: Array.from({ length: 4 }, (_, index: number) => ({
					title: `C${index}`,
					button: {
						label: 'Ver',
						target: StoreSitesEnum.BlockButtonTarget.URL,
						value: 'loja.com',
					},
				})),
			}),
		]);

		expect(box.items).toHaveLength(3);
		expect(box.items[0].button).toMatchObject({
			label: 'Ver',
			value: 'loja.com',
			variant: 'PRIMARY',
		});
	});

	it('allows up to 60 sections', () => {
		expect(
			siteBlocksOf(Array.from({ length: 70 }, () => section())),
		).toHaveLength(60);
	});

	it('drops buttons that go nowhere safe on the public site', () => {
		const url = (value: string) => ({
			label: 'Ir',
			target: StoreSitesEnum.BlockButtonTarget.URL,
			value,
		});

		const [some, box] = publicBlocksOf(
			[
				section({
					type: T.BUTTONS,
					buttons: [url('javascript:x'), url('loja.com')],
				}),
				section({ type: T.BUTTONS, buttons: [url('javascript:x')] }),
				section({
					type: T.BOX,
					items: [{ title: 'C', button: url('javascript:x') }],
				}),
			],
			[],
		);

		expect(some.buttons).toHaveLength(1);
		expect(box.type).toBe(T.BOX);
		expect(box.items[0].button).toBeNull();
	});

	it('keeps an empty part publicly so the order stays', () => {
		expect(publicBlocksOf([section({ type: T.ABOUT })], [])).toHaveLength(1);
	});

	it('keeps a piece still being filled when saved, and shows it only when filled', () => {
		const pieces = [
			section({ key: 'img', type: T.IMAGE, title: null, items: [] }),
			section({ key: 'vid', type: T.VIDEO, title: null }),
			section({ key: 'btn', type: T.BUTTONS, title: null, buttons: [] }),
			section({ key: 'txt', type: T.TEXT, title: null }),
		];

		expect(siteBlocksOf(pieces).map((each) => each.key)).toEqual([
			'img',
			'vid',
			'btn',
			'txt',
		]);
		expect(publicBlocksOf(pieces, [])).toEqual([]);
	});

	it('keeps a hidden entrance publicly, so the site knows it is hidden', () => {
		const [hero] = publicBlocksOf(
			[
				section({ key: 'hero', type: T.HERO, isActive: false }),
				section({ key: 'about', type: T.ABOUT, isActive: false }),
			],
			[],
		);

		expect(hero).toMatchObject({ key: 'hero', isActive: false });
		expect(
			publicBlocksOf([section({ type: T.ABOUT, isActive: false })], []),
		).toEqual([]);
	});

	it('keeps the items of a menu of tabs with the section each one shows', () => {
		const [tabs] = siteBlocksOf([
			section({
				key: 'tabs',
				type: T.TABS,
				items: [
					{ key: 'aaaaaaaaaaa1', title: ' Entradas ', sectionKey: ' s1 ' },
					{ key: 'aaaaaaaaaaa2', title: 'Pratos', sectionKey: 7 },
					{ key: 'aaaaaaaaaaa3', title: '  ', sectionKey: 's3' },
				],
			}),
		]);

		expect(tabs.items.map((item) => [item.title, item.sectionKey])).toEqual([
			['Entradas', 's1'],
			// Still being filled: kept, and the site waits for its section.
			['Pratos', null],
		]);
	});

	it('gives the section of an item to a menu of tabs only', () => {
		const [features] = siteBlocksOf([
			section({
				type: T.FEATURES,
				items: [{ title: 'Rápido', sectionKey: 's1' }],
			}),
		]);

		expect(features.items[0].sectionKey).toBeNull();
	});

	it('lays a menu of tabs as tabs showing one section at a time, unless told otherwise', () => {
		const [plain, side] = siteBlocksOf([
			section({ key: 't1', type: T.TABS, settings: { menuStyle: 'x' } }),
			section({
				key: 't2',
				type: T.TABS,
				settings: { menuStyle: 'SIDE', menuMode: 'SCROLL' },
			}),
		]);

		expect(plain.settings).toMatchObject({
			menuStyle: 'TABS',
			menuMode: 'SWITCH',
			menuSide: 'LEFT',
			menuLook: 'PILL',
			menuEffect: 'SLIDE',
			align: 'CENTER',
			tone: 'NONE',
		});
		expect(side.settings).toMatchObject({
			menuStyle: 'SIDE',
			menuMode: 'SCROLL',
		});
	});
});
