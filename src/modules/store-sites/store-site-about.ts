import {
	IStoreSiteAbout,
	IStoreSiteAboutMedia,
} from './interfaces/store-site.interface';
import StoreSitesEnum from './interfaces/store-sites.enum';

const MAX_TITLE_LENGTH = 80;
const MAX_TEXT_LENGTH = 1500;
const MAX_URL_LENGTH = 600;

const YOUTUBE_HOSTS: string[] = [
	'youtube.com',
	'www.youtube.com',
	'm.youtube.com',
	'youtu.be',
	'www.youtube-nocookie.com',
];
const VIMEO_HOSTS: string[] = [
	'vimeo.com',
	'www.vimeo.com',
	'player.vimeo.com',
];

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d{1,12}$/;

/**
 * The player of a YouTube or Vimeo video, from the link the owner pasted, or
 * null for anything else. Only these two are embedded: the page shows their
 * player, never a page of some other site. YouTube's is the one that sets no
 * cookies until the visitor plays it.
 */
export const embedUrlOf = (link: unknown): string | null => {
	const typed: string = typeof link === 'string' ? link.trim() : '';

	if (!typed || typed.length > MAX_URL_LENGTH) {
		return null;
	}

	let url: URL;

	try {
		url = new URL(
			/^[a-z][a-z0-9+.-]*:/i.test(typed) ? typed : `https://${typed}`,
		);
	} catch {
		return null;
	}

	if (url.protocol !== 'https:' && url.protocol !== 'http:') {
		return null;
	}

	const host: string = url.hostname.toLowerCase();
	const parts: string[] = url.pathname.split('/').filter(Boolean);

	if (YOUTUBE_HOSTS.includes(host)) {
		const id: string | null =
			host === 'youtu.be'
				? parts[0]
				: ['embed', 'shorts', 'live'].includes(parts[0])
				? parts[1]
				: url.searchParams.get('v');

		return id && YOUTUBE_ID.test(id)
			? `https://www.youtube-nocookie.com/embed/${id}`
			: null;
	}

	if (VIMEO_HOSTS.includes(host)) {
		const id: string | undefined =
			host === 'player.vimeo.com' ? parts[1] : parts[0];

		return id && VIMEO_ID.test(id)
			? `https://player.vimeo.com/video/${id}`
			: null;
	}

	return null;
};

/** An image, a video file or a known player, or nothing. */
export const aboutMediaOf = (media: unknown): IStoreSiteAboutMedia | null =>
	toMedia(media);

const toMedia = (media: unknown): IStoreSiteAboutMedia | null => {
	if (!media || typeof media !== 'object') {
		return null;
	}

	const { type, url } = media as Record<string, unknown>;

	if (!Object.values(StoreSitesEnum.AboutMediaType).includes(type as any)) {
		return null;
	}

	if (type === StoreSitesEnum.AboutMediaType.EMBED) {
		const embed: string | null = embedUrlOf(url);

		return embed ? { type, url: embed } : null;
	}

	// An uploaded image or video: the key of the file, as for every image.
	const key: string = typeof url === 'string' ? url.trim() : '';

	return key && key.length <= MAX_URL_LENGTH
		? { type: type as StoreSitesEnum.AboutMediaType, url: key }
		: null;
};

/**
 * The about section of a site, whatever was stored or sent. A site saved
 * before it existed shows it with the store's own description, as before.
 */
export const siteAboutOf = (about: unknown): IStoreSiteAbout => {
	const source: Record<string, unknown> =
		about && typeof about === 'object'
			? (about as Record<string, unknown>)
			: {};

	const position: StoreSitesEnum.AboutMediaPosition = Object.values(
		StoreSitesEnum.AboutMediaPosition,
	).includes(source.mediaPosition as StoreSitesEnum.AboutMediaPosition)
		? (source.mediaPosition as StoreSitesEnum.AboutMediaPosition)
		: StoreSitesEnum.AboutMediaPosition.LEFT;

	return {
		isActive: source.isActive !== false,
		title:
			typeof source.title === 'string' && source.title.trim()
				? source.title.trim().slice(0, MAX_TITLE_LENGTH)
				: null,
		texts: (Array.isArray(source.texts) ? source.texts : [])
			.filter((text: unknown): text is string => typeof text === 'string')
			.map((text: string) => text.trim().slice(0, MAX_TEXT_LENGTH))
			.filter(Boolean)
			.slice(0, StoreSitesEnum.MAX_ABOUT_TEXTS),
		media: toMedia(source.media),
		mediaPosition: position,
	};
};
