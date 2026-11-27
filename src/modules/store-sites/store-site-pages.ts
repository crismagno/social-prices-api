import { randomUUID } from 'crypto';

import {
	IStoreSiteFaqItem,
	IStoreSitePage,
	IStoreSiteTheme,
} from './interfaces/store-site.interface';
import StoreSitesEnum from './interfaces/store-sites.enum';
import { siteAboutOf } from './store-site-about';
import { pageBackdropOf } from './store-site-backdrop';
import { siteContactFormOf } from './store-site-contact';
import { pageHeroOf } from './store-site-hero';

const MAX_LABEL_LENGTH = 30;
const MAX_TITLE_LENGTH = 80;
const MAX_INTRO_LENGTH = 300;
const MAX_QUESTION_LENGTH = 200;
const MAX_ANSWER_LENGTH = 1500;

const SLUG = /^[a-z0-9][a-z0-9-]{0,38}[a-z0-9]$/;

/** The pages every site has, at addresses that never change. */
const READY_PAGES: {
	type: StoreSitesEnum.SitePageType;
	isInMenu: boolean;
}[] = [
	{ type: StoreSitesEnum.SitePageType.PRODUCTS, isInMenu: true },
	{ type: StoreSitesEnum.SitePageType.ABOUT, isInMenu: true },
	// Empty until the owner writes it, so it starts out of the menu.
	{ type: StoreSitesEnum.SitePageType.SUPPORT, isInMenu: false },
	// Its form writes to the store's inbox: the owner decides to show it.
	{ type: StoreSitesEnum.SitePageType.CONTACT, isInMenu: false },
];

const textOf = (value: unknown, max: number): string | null =>
	typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;

const ICONS: string[] = Object.values(StoreSitesEnum.FeatureIcon);

/** One of the ready icons, or none. */
const iconOf = (value: unknown): StoreSitesEnum.FeatureIcon | null =>
	typeof value === 'string' && ICONS.includes(value)
		? (value as StoreSitesEnum.FeatureIcon)
		: null;

export const slugifyPage = (value: unknown): string =>
	String(value ?? '')
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 40)
		.replace(/-+$/g, '');

const faqOf = (faq: unknown): IStoreSiteFaqItem[] =>
	(Array.isArray(faq) ? faq : [])
		.map((item: unknown) => {
			const source: Record<string, unknown> =
				item && typeof item === 'object'
					? (item as Record<string, unknown>)
					: {};

			return {
				question: textOf(source.question, MAX_QUESTION_LENGTH),
				answer: textOf(source.answer, MAX_ANSWER_LENGTH) ?? '',
			};
		})
		.filter((item): item is IStoreSiteFaqItem => !!item.question)
		.slice(0, StoreSitesEnum.MAX_FAQ_ITEMS);

const THEME_KEYS: (keyof IStoreSiteTheme)[] = [
	'primary',
	'secondary',
	'accent',
	'background',
	'text',
];

/** The colours a page changes; null when it changes none. */
export const pageThemeOf = (
	theme: unknown,
): Partial<IStoreSiteTheme> | null => {
	const source: Record<string, unknown> =
		theme && typeof theme === 'object'
			? (theme as Record<string, unknown>)
			: {};

	const own: Partial<IStoreSiteTheme> = {};

	for (const key of THEME_KEYS) {
		const color: unknown = source[key];

		if (
			typeof color === 'string' &&
			StoreSitesEnum.HEX_COLOR_REGEX.test(color)
		) {
			own[key] = color;
		}
	}

	return Object.keys(own).length ? own : null;
};

const pageOf = (
	source: Record<string, unknown>,
	type: StoreSitesEnum.SitePageType,
	slug: string,
	isInMenuByDefault: boolean,
): IStoreSitePage => {
	const {
		title: contentTitle,
		texts,
		media,
		mediaPosition,
	} = siteAboutOf(source.content);

	return {
		key:
			typeof source.key === 'string' && source.key.trim()
				? source.key.trim().slice(0, 60)
				: type === StoreSitesEnum.SitePageType.CUSTOM
				? randomUUID()
				: type.toLowerCase(),
		type,
		slug,
		label: textOf(source.label, MAX_LABEL_LENGTH),
		isInMenu:
			typeof source.isInMenu === 'boolean'
				? source.isInMenu
				: isInMenuByDefault,
		icon: iconOf(source.icon),
		title: textOf(source.title, MAX_TITLE_LENGTH),
		intro: textOf(source.intro, MAX_INTRO_LENGTH),
		content: { title: contentTitle, texts, media, mediaPosition },
		faq: type === StoreSitesEnum.SitePageType.SUPPORT ? faqOf(source.faq) : [],
		hero: pageHeroOf(source.hero),
		theme: pageThemeOf(source.theme),
		backdrop: pageBackdropOf(source.backdrop),
		contact:
			type === StoreSitesEnum.SitePageType.CONTACT
				? siteContactFormOf(source.contact)
				: null,
	};
};

/**
 * The pages of a site, in the order of its menu, whatever was stored or sent.
 * A site saved before pages existed gets the ready ones (products, about,
 * support). After that the owner decides: a ready page can be removed, and
 * is then simply not there. A ready page is kept once, at its own address; the
 * owner's own pages get a clean address that no other page uses.
 */
export const sitePagesOf = (pages: unknown): IStoreSitePage[] => {
	if (!Array.isArray(pages)) {
		return READY_PAGES.map((ready) =>
			pageOf(
				{},
				ready.type,
				StoreSitesEnum.READY_PAGE_SLUGS[ready.type],
				ready.isInMenu,
			),
		);
	}

	const sources: Record<string, unknown>[] = pages
		.filter((page: unknown) => !!page && typeof page === 'object')
		.map((page: unknown) => page as Record<string, unknown>);

	const readySlugs: string[] = Object.values(StoreSitesEnum.READY_PAGE_SLUGS);

	const result: IStoreSitePage[] = [];
	const usedSlugs: Set<string> = new Set();

	for (const source of sources) {
		const type = source.type as StoreSitesEnum.SitePageType;

		if (result.length >= StoreSitesEnum.MAX_PAGES) {
			break;
		}

		if (type === StoreSitesEnum.SitePageType.CUSTOM) {
			const slug: string = slugifyPage(source.slug);

			if (
				!SLUG.test(slug) ||
				readySlugs.includes(slug) ||
				slug === StoreSitesEnum.CART_PAGE_SLUG ||
				slug === StoreSitesEnum.PRODUCT_PAGE_SLUG ||
				usedSlugs.has(slug)
			) {
				continue;
			}

			usedSlugs.add(slug);
			result.push(pageOf(source, type, slug, true));
			continue;
		}

		const ready = READY_PAGES.find((page) => page.type === type);

		if (!ready || result.some((page) => page.type === type)) {
			continue;
		}

		result.push(
			pageOf(
				source,
				type,
				StoreSitesEnum.READY_PAGE_SLUGS[type],
				ready.isInMenu,
			),
		);
	}

	return result;
};
