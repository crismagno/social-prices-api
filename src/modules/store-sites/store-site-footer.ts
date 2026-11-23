import { randomUUID } from 'crypto';

import {
	IStoreSiteFooter,
	IStoreSiteFooterLink,
	IStoreSiteFooterSection,
} from './interfaces/store-site.interface';
import StoreSitesEnum from './interfaces/store-sites.enum';

const MAX_URL_LENGTH = 300;
const MAX_LABEL_LENGTH = 40;
const MAX_TEXT_LENGTH = 300;
const MAX_SECTION_TITLE_LENGTH = 40;

/**
 * How the footer was before it had sections: the words on one side, the links
 * on the other. A site that never chose its sections keeps looking like that.
 */
const DEFAULT_SECTIONS: IStoreSiteFooterSection[] = [
	{ key: 'main', title: null },
	{ key: 'links', title: null },
];

/** The only ways a link of the footer may open. */
const ALLOWED_PROTOCOLS: string[] = ['http:', 'https:', 'mailto:', 'tel:'];

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const toPhone = (value: string): string | null => {
	const digits: string = value.replace(/[^\d]/g, '');

	if (digits.length < 8 || digits.length > 15 || /[a-z]/i.test(value)) {
		return null;
	}

	return value.trim().startsWith('+') ? `+${digits}` : digits;
};

/**
 * The address a link of the footer may point to, or null when it is not one
 * that is safe to put on a public page. What was typed is completed the way a
 * person means it: a number becomes a call or a chat, an address without
 * "https://" gets it. Scripts and local files never pass.
 */
export const safeFooterUrl = (
	type: StoreSitesEnum.FooterLinkType,
	rawUrl: unknown,
): string | null => {
	const typed: string = typeof rawUrl === 'string' ? rawUrl.trim() : '';

	if (!typed || typed.length > MAX_URL_LENGTH) {
		return null;
	}

	const hasScheme: boolean = HAS_SCHEME.test(typed);

	let candidate: string = typed;

	if (!hasScheme) {
		if (type === StoreSitesEnum.FooterLinkType.EMAIL) {
			if (!EMAIL.test(typed)) {
				return null;
			}

			return `mailto:${typed.toLowerCase()}`;
		}

		if (type === StoreSitesEnum.FooterLinkType.PHONE) {
			const phone: string | null = toPhone(typed);

			return phone ? `tel:${phone}` : null;
		}

		const whatsapp: string | null =
			type === StoreSitesEnum.FooterLinkType.WHATSAPP ? toPhone(typed) : null;

		candidate = whatsapp
			? `https://wa.me/${whatsapp.replace('+', '')}`
			: `https://${typed}`;
	}

	try {
		const url: URL = new URL(candidate);

		const isWeb: boolean =
			url.protocol === 'http:' || url.protocol === 'https:';

		if (
			!ALLOWED_PROTOCOLS.includes(url.protocol) ||
			(isWeb && !url.hostname.includes('.'))
		) {
			return null;
		}

		// As typed (already known to be safe), so nothing the owner wrote changes.
		return candidate;
	} catch {
		return null;
	}
};

const toLink = (
	link: unknown,
	placeOf: (section: unknown, fallback: string) => string,
	linksSection: string,
): IStoreSiteFooterLink | null => {
	if (!link || typeof link !== 'object') {
		return null;
	}

	const source: Record<string, unknown> = link as Record<string, unknown>;

	const type: StoreSitesEnum.FooterLinkType = Object.values(
		StoreSitesEnum.FooterLinkType,
	).includes(source.type as StoreSitesEnum.FooterLinkType)
		? (source.type as StoreSitesEnum.FooterLinkType)
		: StoreSitesEnum.FooterLinkType.WEBSITE;

	const url: string | null = safeFooterUrl(type, source.url);

	if (!url) {
		return null;
	}

	return {
		key:
			typeof source.key === 'string' && source.key.trim()
				? source.key.trim().slice(0, 60)
				: randomUUID(),
		type,
		label:
			typeof source.label === 'string'
				? source.label.trim().slice(0, MAX_LABEL_LENGTH)
				: '',
		url,
		section: placeOf(source.section, linksSection),
	};
};

/** One to five sections, each key once; none left means the default two. */
const toSections = (sections: unknown): IStoreSiteFooterSection[] => {
	const seen: Set<string> = new Set();

	const kept: IStoreSiteFooterSection[] = (
		Array.isArray(sections) ? sections : []
	).reduce((result: IStoreSiteFooterSection[], section: unknown) => {
		const source: Record<string, unknown> =
			section && typeof section === 'object'
				? (section as Record<string, unknown>)
				: {};

		const key: string =
			typeof source.key === 'string' ? source.key.trim().slice(0, 60) : '';

		if (key && !seen.has(key)) {
			seen.add(key);

			result.push({
				key,
				title:
					typeof source.title === 'string' && source.title.trim()
						? source.title.trim().slice(0, MAX_SECTION_TITLE_LENGTH)
						: null,
			});
		}

		return result;
	}, []);

	return kept.length
		? kept.slice(0, StoreSitesEnum.MAX_FOOTER_SECTIONS)
		: DEFAULT_SECTIONS.map((section) => ({ ...section }));
};

/**
 * The footer of a site, whatever was stored or sent. A site saved before the
 * footer existed gets one with the way into the app and nothing else.
 */
const MAX_LOGO_URL_LENGTH = 600;
const DEFAULT_LOGO_HEIGHT = 48;

/** The height of the footer's logo: a whole number of pixels, 20 to 160. */
const logoHeightOf = (value: unknown): number =>
	typeof value === 'number' && Number.isFinite(value)
		? Math.min(160, Math.max(20, Math.round(value)))
		: DEFAULT_LOGO_HEIGHT;

export const siteFooterOf = (footer: unknown): IStoreSiteFooter => {
	const source: Record<string, unknown> =
		footer && typeof footer === 'object' && !Array.isArray(footer)
			? (footer as Record<string, unknown>)
			: {};

	const links: unknown[] = Array.isArray(source.links) ? source.links : [];

	const sections: IStoreSiteFooterSection[] = toSections(source.sections);

	const first: string = sections[0].key;

	// Where links go when they do not say: the second column if there is one,
	// which is where they always were.
	const linksSection: string = sections[1]?.key ?? first;

	// Whatever points to a section that is gone falls back instead of vanishing.
	const placeOf = (section: unknown, fallback: string): string =>
		typeof section === 'string' &&
		sections.some((known: IStoreSiteFooterSection) => known.key === section)
			? section
			: fallback;

	const hasOwnSections: boolean =
		Array.isArray(source.sections) && source.sections.length > 0;

	return {
		isActive: source.isActive !== false,
		text:
			typeof source.text === 'string' && source.text.trim()
				? source.text.trim().slice(0, MAX_TEXT_LENGTH)
				: null,
		isLoginVisible: source.isLoginVisible !== false,
		isLogoVisible: source.isLogoVisible === true,
		logoUrl:
			typeof source.logoUrl === 'string' && source.logoUrl.trim()
				? source.logoUrl.trim().slice(0, MAX_LOGO_URL_LENGTH)
				: null,
		logoHeight: logoHeightOf(source.logoHeight),
		sections,
		textSection: placeOf(source.textSection, first),
		loginSection: placeOf(source.loginSection, first),
		links: links
			.map((link: unknown) =>
				toLink(link, placeOf, hasOwnSections ? first : linksSection),
			)
			.filter((link: IStoreSiteFooterLink | null) => !!link)
			.slice(0, StoreSitesEnum.MAX_FOOTER_LINKS),
	};
};
