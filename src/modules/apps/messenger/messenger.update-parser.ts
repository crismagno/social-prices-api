import {
	IMessengerAttachment,
	INormalizedMessengerMessage,
} from './messenger.types';

const isObject = (value: unknown): value is Record<string, any> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const readAttachments = (raw: unknown): IMessengerAttachment[] =>
	(Array.isArray(raw) ? raw : [])
		.filter(
			(attachment: any) =>
				isObject(attachment) &&
				typeof attachment.type === 'string' &&
				typeof attachment.payload?.url === 'string',
		)
		.map((attachment: any) => ({
			type: attachment.type,
			url: attachment.payload.url,
		}));

/**
 * Reads what customers wrote to a Page. Only their messages count: echoes of
 * what the Page sent, deliveries, reads and postbacks are dropped. Never throws,
 * whatever the body looks like.
 */
export const parseMessengerWebhook = (
	body: unknown,
): INormalizedMessengerMessage[] => {
	if (!isObject(body) || body.object !== 'page' || !Array.isArray(body.entry)) {
		return [];
	}

	const messages: INormalizedMessengerMessage[] = [];

	for (const entry of body.entry) {
		if (!isObject(entry) || !Array.isArray(entry.messaging)) {
			continue;
		}

		const pageId: string = String(entry.id);

		for (const event of entry.messaging) {
			const message = isObject(event) ? event.message : undefined;

			if (
				!isObject(message) ||
				message.is_echo ||
				typeof message.mid !== 'string' ||
				typeof event.sender?.id !== 'string' ||
				event.sender.id === pageId
			) {
				continue;
			}

			messages.push({
				pageId,
				psid: event.sender.id,
				mid: message.mid,
				text: typeof message.text === 'string' ? message.text : null,
				attachments: readAttachments(message.attachments),
				sentAt: new Date(
					typeof event.timestamp === 'number' ? event.timestamp : Date.now(),
				),
			});
		}
	}

	return messages;
};
