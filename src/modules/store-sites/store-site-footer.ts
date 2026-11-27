import { randomUUID } from 'crypto';

import {
	IStoreSiteFooter,
	IStoreSiteFooterLink,
	IStoreSiteFooterSection,
} from './interfaces/store-site.interface';
import StoreSitesEnum from './interfaces/store-sites.enum';

const MAX_URL_LENGTH = 300;
const MAX_LABEL_LENGTH = 40;
const MAX_SECTION_TITLE_LENGTH = 40;
const DEFAULT_LOGO_HEIGHT = 48;

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

const MAX_NOTE_LENGTH = 300;
const MAX_IMAGE_KEY_LENGTH = 600;
const IMAGE_HEIGHT_RANGE: [number, number] = [20, 240];

const F = StoreSitesEnum.FooterLinkType;

const isContent = (type: StoreSitesEnum.FooterLinkType): boolean =>
	StoreSitesEnum.FOOTER_CONTENT_TYPES.includes(type);

const heightOf = (value: unknown, fallback: number): number =>
	typeof value === 'number' && Number.isFinite(value)
		? Math.min(
				IMAGE_HEIGHT_RANGE[1],
				Math.max(IMAGE_HEIGHT_RANGE[0], Math.round(value)),
		  )
		: fallback;

const imageKeyOf = (value: unknown): string | null =>
	typeof value === 'string' && value.trim()
		? value.trim().slice(0, MAX_IMAGE_KEY_LENGTH)
		: null;

/**
 * One item of the footer, or null when it has nothing to show: a link without
 * a safe address, a paragraph without words, an image without a picture.
 */
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

	const typedLabel: string =
		typeof source.label === 'string' ? source.label.trim() : '';

	const base = {
		key:
			typeof source.key === 'string' && source.key.trim()
				? source.key.trim().slice(0, 60)
				: randomUUID(),
		type,
		section: placeOf(source.section, linksSection),
	};

	if (!isContent(type)) {
		const url: string | null = safeFooterUrl(type, source.url);

		return url
			? {
					...base,
					label: typedLabel.slice(0, MAX_LABEL_LENGTH),
					url,
					imageUrl: null,
					height: null,
			  }
			: null;
	}

	switch (type) {
		case F.NOTE:
			return typedLabel
				? {
						...base,
						label: typedLabel.slice(0, MAX_NOTE_LENGTH),
						url: '',
						imageUrl: null,
						height: null,
				  }
				: null;
		case F.IMAGE: {
			const imageUrl: string | null = imageKeyOf(source.imageUrl);

			return imageUrl
				? {
						...base,
						label: typedLabel.slice(0, MAX_LABEL_LENGTH),
						// Where the picture leads, when it leads somewhere safe.
						url: safeFooterUrl(F.WEBSITE, source.url) ?? '',
						imageUrl,
						height: heightOf(source.height, 80),
				  }
				: null;
		}
		case F.LOGO:
			return {
				...base,
				label: '',
				url: '',
				// Its own picture; empty, the logo of the site.
				imageUrl: imageKeyOf(source.imageUrl),
				height: heightOf(source.height, DEFAULT_LOGO_HEIGHT),
			};
		default:
			// The name (the owner's words, or the site's) and the sign-in.
			return {
				...base,
				label: type === F.NAME ? typedLabel.slice(0, MAX_LABEL_LENGTH) : '',
				url: '',
				imageUrl: null,
				height: null,
			};
	}
};

/**
 * What a footer saved before its items had kinds showed from its own fields,
 * as items: the logo, the name and the text where the text was, and the
 * sign-in where it was.
 */
const legacyItemsOf = (
	source: Record<string, unknown>,
	textSection: string,
	loginSection: string,
): { before: IStoreSiteFooterLink[]; after: IStoreSiteFooterLink[] } => {
	const item = (
		key: string,
		type: StoreSitesEnum.FooterLinkType,
		section: string,
		patch: Partial<IStoreSiteFooterLink> = {},
	): IStoreSiteFooterLink => ({
		key,
		type,
		label: '',
		url: '',
		section,
		imageUrl: null,
		height: null,
		...patch,
	});

	const text: string =
		typeof source.text === 'string' ? source.text.trim() : '';

	return {
		before: [
			...(source.isLogoVisible === true
				? [
						item('legacy-logo', F.LOGO, textSection, {
							imageUrl: imageKeyOf(source.logoUrl),
							height: heightOf(source.logoHeight, DEFAULT_LOGO_HEIGHT),
						}),
				  ]
				: []),
			item('legacy-name', F.NAME, textSection),
			...(text
				? [
						item('legacy-note', F.NOTE, textSection, {
							label: text.slice(0, MAX_NOTE_LENGTH),
						}),
				  ]
				: []),
		],
		after:
			source.isLoginVisible !== false
				? [item('legacy-sign-in', F.SIGN_IN, loginSection)]
				: [],
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
 * footer existed gets one with its name and the way into the app. One saved
 * before its items had kinds has its name, logo, text and sign-in read into
 * items, where they were.
 */
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

	const textSection: string = placeOf(source.textSection, first);
	const loginSection: string = placeOf(source.loginSection, first);

	const own: IStoreSiteFooterLink[] = links
		.map((link: unknown) =>
			toLink(link, placeOf, hasOwnSections ? first : linksSection),
		)
		.filter((link: IStoreSiteFooterLink | null): link is IStoreSiteFooterLink =>
			Boolean(link),
		);

	const legacy =
		source.itemsVersion === 2
			? { before: [], after: [] }
			: legacyItemsOf(source, textSection, loginSection);

	return {
		isActive: source.isActive !== false,
		// Read into items above: the footer shows only its items.
		text: null,
		isLoginVisible: false,
		isLogoVisible: false,
		logoUrl: null,
		logoHeight: DEFAULT_LOGO_HEIGHT,
		sections,
		textSection,
		loginSection,
		links: [...legacy.before, ...own, ...legacy.after].slice(
			0,
			StoreSitesEnum.MAX_FOOTER_LINKS,
		),
		itemsVersion: 2,
	};
};
