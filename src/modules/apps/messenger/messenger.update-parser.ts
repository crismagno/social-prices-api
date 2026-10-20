import MessengerEnum from './messenger.enum';
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
 * Reads the messages of a conversation with a Page: what customers wrote, and the
 * "echoes" of what the Page sent from outside this system (Messenger, Business
 * Suite). Deliveries, reads and postbacks are dropped. Never throws, whatever
 * the body looks like.
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

			if (!isObject(message) || typeof message.mid !== 'string') {
				continue;
			}

			// The person of the conversation: who wrote, or who the Page wrote to.
			const isEcho: boolean = message.is_echo === true;
			const psid: unknown = isEcho ? event.recipient?.id : event.sender?.id;
			const sender: unknown = event.sender?.id;

			if (
				typeof psid !== 'string' ||
				psid === pageId ||
				(isEcho ? sender !== pageId : sender === pageId)
			) {
				continue;
			}

			messages.push({
				pageId,
				psid,
				direction: isEcho
					? MessengerEnum.Direction.OUT
					: MessengerEnum.Direction.IN,
				mid: message.mid,
				text: typeof message.text === 'string' ? message.text : null,
				attachments: readAttachments(message.attachments),
				sentAt: new Date(
					typeof event.timestamp === 'number' ? event.timestamp : Date.now(),
				),
				raw: event,
			});
		}
	}

	return messages;
};
