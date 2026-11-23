import StoreSitesEnum from './interfaces/store-sites.enum';
import {
	blockButtonHref,
	publicBlocksOf,
	siteBlocksOf,
} from './store-site-blocks';

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
					title: 'Ana',
					subtitle: 'São Paulo',
					text: 'Amei!',
					imageUrl: 'ana.png',
					icon: null,
					rating: 5,
				},
			],
			button: null,
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
				Array.from({ length: 25 }, (_, index: number) =>
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
			blockButtonHref({ label: null, target, pageKey: null, value }, []);

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
				},
				['p1'],
			);

		expect(page(null)).toBe('');
		expect(page('p1')).toBe('');
		expect(page('gone')).toBeNull();
	});
});
