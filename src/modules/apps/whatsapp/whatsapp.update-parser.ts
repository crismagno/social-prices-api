import { INormalizedWhatsappMessage, IWhatsappMedia } from './whatsapp.types';

const isObject = (value: unknown): value is Record<string, any> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const str = (value: unknown): string | null =>
	typeof value === 'string' && value ? value : null;

/** The files WhatsApp delivers by id. */
const MEDIA_TYPES: string[] = [
	'image',
	'audio',
	'video',
	'document',
	'sticker',
];

const mediaOf = (
	type: string,
	content: Record<string, any>,
): IWhatsappMedia | null =>
	typeof content.id === 'string'
		? {
				id: content.id,
				mimeType: str(content.mime_type),
				fileName: type === 'document' ? str(content.filename) : null,
				isVoice: type === 'audio' && content.voice === true,
		  }
		: null;

/** What a message that has no text and no file says, as text. */
const describe = (
	type: string,
	content: Record<string, any>,
): string | null => {
	switch (type) {
		case 'location':
			return [
				str(content.name),
				str(content.address),
				typeof content.latitude === 'number' &&
				typeof content.longitude === 'number'
					? `${content.latitude}, ${content.longitude}`
					: null,
			]
				.filter(Boolean)
				.join(' · ');

		case 'contacts':
			return (Array.isArray(content) ? content : [])
				.map((contact: any) => str(contact?.name?.formatted_name))
				.filter(Boolean)
				.join(', ');

		case 'button':
			return str(content.text);

		case 'interactive':
			return str(content.button_reply?.title) ?? str(content.list_reply?.title);

		default:
			return null;
	}
};

/** Types that are not a message to show: a reaction is an emoji on another message. */
const IGNORED_TYPES: string[] = ['reaction'];

/**
 * Reads what customers wrote to a business number. Delivery and read statuses,
 * reactions and everything that is not a message are dropped. Never throws,
 * whatever the body looks like.
 */
export const parseWhatsappWebhook = (
	body: unknown,
): INormalizedWhatsappMessage[] => {
	if (
		!isObject(body) ||
		body.object !== 'whatsapp_business_account' ||
		!Array.isArray(body.entry)
	) {
		return [];
	}

	const messages: INormalizedWhatsappMessage[] = [];

	for (const entry of body.entry) {
		if (!isObject(entry) || !Array.isArray(entry.changes)) {
			continue;
		}

		for (const change of entry.changes) {
			const value = isObject(change) ? change.value : undefined;

			if (
				!isObject(value) ||
				change.field !== 'messages' ||
				!Array.isArray(value.messages)
			) {
				continue;
			}

			const phoneNumberId: string | null = str(value.metadata?.phone_number_id);

			if (!phoneNumberId) {
				continue;
			}

			const contacts: Record<string, any>[] = Array.isArray(value.contacts)
				? value.contacts.filter(isObject)
				: [];

			for (const message of value.messages) {
				const mid: string | null = isObject(message) ? str(message.id) : null;
				const waId: string | null = isObject(message)
					? str(message.from)
					: null;
				const type: string | null = isObject(message)
					? str(message.type)
					: null;

				if (!mid || !waId || !type || IGNORED_TYPES.includes(type)) {
					continue;
				}

				const content: any = message[type];
				const contact = contacts.find((item) => item.wa_id === waId);

				const media: IWhatsappMedia | null =
					MEDIA_TYPES.includes(type) && isObject(content)
						? mediaOf(type, content)
						: null;

				const text: string | null =
					type === 'text' && isObject(content)
						? str(content.body)
						: media
						? str(content?.caption)
						: describe(type, content ?? {});

				const isKnown: boolean =
					type === 'text' ||
					!!media ||
					['location', 'contacts', 'button', 'interactive'].includes(type);

				const timestamp: number = Number(message.timestamp);

				messages.push({
					phoneNumberId,
					waId,
					profileName: str(contact?.profile?.name),
					mid,
					type,
					text,
					media,
					isUnsupported: !isKnown || (!text && !media),
					sentAt: new Date(
						Number.isFinite(timestamp) && timestamp > 0
							? timestamp * 1000
							: Date.now(),
					),
					raw: { metadata: value.metadata, contact: contact ?? null, message },
				});
			}
		}
	}

	return messages;
};
