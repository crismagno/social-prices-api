import * as sanitizeHtml from 'sanitize-html';

/**
 * What a product's description and details may hold: the formatting of the
 * panel's text editor, and nothing that could run or load anything.
 */
const OPTIONS: sanitizeHtml.IOptions = {
	allowedTags: [
		'p',
		'br',
		'strong',
		'b',
		'em',
		'i',
		'u',
		's',
		'mark',
		'code',
		'h2',
		'h3',
		'h4',
		'ul',
		'ol',
		'li',
		'blockquote',
		'hr',
		'a',
	],
	allowedAttributes: {
		a: ['href', 'target', 'rel'],
		p: ['style'],
		h2: ['style'],
		h3: ['style'],
		h4: ['style'],
		ol: ['start'],
	},
	// Only the alignment the editor sets: no colors, sizes or positions.
	allowedStyles: {
		'*': { 'text-align': [/^(left|right|center|justify)$/] },
	},
	allowedSchemes: ['http', 'https', 'mailto', 'tel'],
	allowProtocolRelative: false,
	// A link always opens apart and tells nothing of where it came from.
	transformTags: {
		a: sanitizeHtml.simpleTransform('a', {
			target: '_blank',
			rel: 'noopener noreferrer nofollow',
		}),
	},
};

/** Whether a text was written in the editor (HTML) rather than typed plain. */
export const isRichText = (value: string | null | undefined): boolean =>
	/^\s*<(p|ul|ol|h[1-6]|blockquote|hr|br)[\s>/]/i.test(value ?? '');

/**
 * A text of the editor cleaned to what it may hold; a plain text stays as it
 * was typed. Empty, it is null.
 */
export const sanitizeRichText = (
	value: string | null | undefined,
): string | null => {
	if (typeof value !== 'string' || !value.trim()) {
		return null;
	}

	if (!isRichText(value)) {
		return value.trim();
	}

	const clean: string = sanitizeHtml(value, OPTIONS).trim();

	// An editor left empty still sends an empty paragraph.
	return richTextToPlain(clean) ? clean : null;
};

/** The words of a text without its formatting: for a spreadsheet or a search. */
export const richTextToPlain = (value: string | null | undefined): string => {
	if (!isRichText(value)) {
		return value ?? '';
	}

	return sanitizeHtml(
		value
			.replace(/<\/(p|h[1-6]|li|blockquote)>/gi, '\n')
			.replace(/<br\s*\/?>/gi, '\n'),
		{ allowedTags: [], allowedAttributes: {} },
	)
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/\n{3,}/g, '\n\n')
		.trim();
};

/** How a chat writes formatting: WhatsApp's own marks, or none at all. */
export type TChatTextStyle = 'whatsapp' | 'plain';

const decodeEntities = (value: string): string =>
	value
		.replace(/&nbsp;/g, ' ')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&amp;/g, '&');

/** Wraps the words in a mark, keeping the spaces around them outside it. */
const markOf =
	(mark: string) =>
	(_: string, inner: string): string => {
		const [, before, words, after] = inner.match(/^(\s*)([\s\S]*?)(\s*)$/);

		return words ? `${before}${mark}${words}${mark}${after}` : inner;
	};

/**
 * A text of the editor as a chat message: lists, quotes and links in words,
 * bold, italic and strikethrough in WhatsApp's marks there, and left out where
 * the channel shows none. A plain text is sent as it was typed.
 */
export const richTextToChatText = (
	value: string | null | undefined,
	style: TChatTextStyle,
): string => {
	if (!isRichText(value)) {
		return value ?? '';
	}

	const isWhatsapp: boolean = style === 'whatsapp';

	let text: string = sanitizeRichText(value) ?? '';

	// Links: the words, and where they lead when it is not the same.
	text = text.replace(
		/<a [^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
		(_: string, href: string, words: string) => {
			const label: string = words.replace(/<[^>]*>/g, '').trim();
			const url: string = decodeEntities(href);

			return !label || decodeEntities(label) === url
				? url
				: `${words} (${url})`;
		},
	);

	// Lists, the innermost first, so a list inside an item keeps its place.
	let previous: string;

	do {
		previous = text;
		text = text.replace(
			/<(ul|ol)(?: start="(\d+)")?>((?:(?!<\/?(?:ul|ol)[\s>])[\s\S])*?)<\/\1>/i,
			(_: string, kind: string, start: string, items: string) => {
				let number: number = Number(start) || 1;

				const lines: string = items.replace(
					/<li>([\s\S]*?)<\/li>/gi,
					(__: string, item: string) => {
						const bullet: string =
							kind.toLowerCase() === 'ol' ? `${number++}. ` : '• ';
						const body: string = item
							.replace(/<\/?p[^>]*>/gi, '')
							.replace(/\n(?=.)/g, '\n   ');

						return `${bullet}${body}\n`;
					},
				);

				return `\n${lines}`;
			},
		);
	} while (text !== previous);

	text = text
		.replace(/<(strong|b)>([\s\S]*?)<\/\1>/gi, (match, _tag, inner) =>
			isWhatsapp ? markOf('*')(match, inner) : inner,
		)
		.replace(/<(em|i)>([\s\S]*?)<\/\1>/gi, (match, _tag, inner) =>
			isWhatsapp ? markOf('_')(match, inner) : inner,
		)
		.replace(/<s>([\s\S]*?)<\/s>/gi, (match, inner) =>
			isWhatsapp ? markOf('~')(match, inner) : inner,
		)
		.replace(/<code>([\s\S]*?)<\/code>/gi, (match, inner) =>
			isWhatsapp ? markOf('`')(match, inner) : inner,
		)
		.replace(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/gi, (match, inner) =>
			isWhatsapp ? `${markOf('*')(match, inner)}\n` : `${inner}\n`,
		)
		.replace(/<blockquote>([\s\S]*?)<\/blockquote>/gi, (_, inner: string) =>
			inner
				.replace(/<\/p>\s*<p[^>]*>/gi, '\n')
				.replace(/<\/?p[^>]*>/gi, '')
				.split('\n')
				.map((line: string) => `> ${line}`)
				.join('\n')
				.concat('\n'),
		)
		.replace(/<hr\s*\/?>/gi, '———\n')
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<\/p>/gi, '\n')
		.replace(/<[^>]*>/g, '');

	return decodeEntities(text)
		.replace(/[ \t]+\n/g, '\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
};
