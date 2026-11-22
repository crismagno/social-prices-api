import StoreSitesEnum from './interfaces/store-sites.enum';
import { sitePagesOf } from './store-site-pages';

const Type = StoreSitesEnum.SitePageType;

const custom = (patch: any = {}) => ({
	key: 'c1',
	type: Type.CUSTOM,
	slug: 'encomendas',
	label: 'Encomendas',
	isInMenu: true,
	title: 'Como encomendar',
	intro: 'Passo a passo',
	content: { texts: ['Escolha', 'Pague'], media: null, mediaPosition: 'LEFT' },
	faq: [],
	...patch,
});

describe('sitePagesOf', () => {
	it('gives the three ready pages to a site saved before pages existed', () => {
		const pages = sitePagesOf(undefined);

		expect(pages.map((page) => [page.type, page.slug, page.isInMenu])).toEqual([
			[Type.PRODUCTS, 'produtos', true],
			[Type.ABOUT, 'sobre', true],
			[Type.SUPPORT, 'suporte', false],
		]);
		expect(pages[0]).toMatchObject({
			label: null,
			title: null,
			intro: null,
			content: { texts: [], media: null, mediaPosition: 'LEFT' },
			faq: [],
		});
	});

	it('keeps the order chosen, which is the order of the menu', () => {
		const pages = sitePagesOf([
			{ key: 'support', type: Type.SUPPORT, isInMenu: true },
			custom(),
			{ key: 'products', type: Type.PRODUCTS },
		]);

		expect(pages.map((page) => page.type)).toEqual([
			Type.SUPPORT,
			Type.CUSTOM,
			Type.PRODUCTS,
			// A ready page that was left out comes back at the end.
			Type.ABOUT,
		]);
	});

	it('keeps a ready page once, at its own address, whatever was sent', () => {
		const pages = sitePagesOf([
			{ key: 'p1', type: Type.PRODUCTS, slug: 'loja' },
			{ key: 'p2', type: Type.PRODUCTS },
		]);

		expect(pages.filter((page) => page.type === Type.PRODUCTS)).toHaveLength(1);
		expect(pages[0].slug).toBe('produtos');
	});

	it('keeps a page of the owner with its texts trimmed', () => {
		const [page] = sitePagesOf([
			custom({ label: '  Encomendas ', title: ' Como ', intro: ' Oi ' }),
		]);

		expect(page).toMatchObject({
			key: 'c1',
			type: Type.CUSTOM,
			slug: 'encomendas',
			label: 'Encomendas',
			title: 'Como',
			intro: 'Oi',
			isInMenu: true,
			content: { texts: ['Escolha', 'Pague'] },
		});
	});

	it('turns the address of a page of the owner into a clean one', () => {
		const [page] = sitePagesOf([custom({ slug: ' Como Encomendar! ' })]);

		expect(page.slug).toBe('como-encomendar');
	});

	it.each([
		['the address of a ready page', 'produtos'],
		['an address too short', 'a'],
		['no address at all', ''],
	])('drops a page of the owner with %s', (_label, slug) => {
		expect(
			sitePagesOf([custom({ slug })]).some((page) => page.type === Type.CUSTOM),
		).toBe(false);
	});

	it('drops a second page of the owner at the same address', () => {
		const pages = sitePagesOf([
			custom({ key: 'a' }),
			custom({ key: 'b', label: 'Other' }),
		]);

		expect(pages.filter((page) => page.type === Type.CUSTOM)).toHaveLength(1);
	});

	it('keeps at most seven pages of the owner', () => {
		const pages = sitePagesOf(
			Array.from({ length: 10 }, (_, index) =>
				custom({ key: `k${index}`, slug: `pagina-${index}` }),
			),
		);

		expect(pages.filter((page) => page.type === Type.CUSTOM)).toHaveLength(7);
	});

	it('keeps the questions of the support page, without empty ones, at most twelve', () => {
		const [support] = sitePagesOf([
			{
				key: 's',
				type: Type.SUPPORT,
				faq: [
					{ question: ' Qual o prazo? ', answer: ' 7 dias ' },
					{ question: '', answer: 'sem pergunta' },
					...Array.from({ length: 20 }, () => ({ question: 'q', answer: 'a' })),
				],
			},
		]);

		expect(support.faq[0]).toEqual({
			question: 'Qual o prazo?',
			answer: '7 dias',
		});
		expect(support.faq).toHaveLength(12);
	});

	it('keeps questions only on the support page', () => {
		const [page] = sitePagesOf([
			custom({ faq: [{ question: 'q', answer: 'a' }] }),
		]);

		expect(page.faq).toEqual([]);
	});

	it('keeps only video players this site embeds in the content', () => {
		const [page] = sitePagesOf([
			custom({
				content: {
					texts: [],
					media: { type: 'EMBED', url: 'https://evil.com' },
				},
			}),
		]);

		expect(page.content.media).toBeNull();
	});

	it('survives garbage', () => {
		expect(sitePagesOf('x')).toHaveLength(3);
		expect(sitePagesOf([null, 'x', { type: 'NOPE' }])).toHaveLength(3);
	});
});
