import InstagramEnum from './instagram.enum';
import {
	IInstagramAttachment,
	INormalizedInstagramMessage,
} from './instagram.types';

const isObject = (value: unknown): value is Record<string, any> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const readAttachments = (raw: unknown): IInstagramAttachment[] =>
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
 * Reads the messages of a conversation with an account: what customers wrote, and
 * the "echoes" of what the account sent from outside this system (the Instagram
 * app). Reactions, reads and a message that was unsent are dropped. Never throws,
 * whatever the body looks like.
 */
export const parseInstagramWebhook = (
	body: unknown,
): INormalizedInstagramMessage[] => {
	if (
		!isObject(body) ||
		body.object !== 'instagram' ||
		!Array.isArray(body.entry)
	) {
		return [];
	}

	const messages: INormalizedInstagramMessage[] = [];

	for (const entry of body.entry) {
		if (!isObject(entry) || !Array.isArray(entry.messaging)) {
			continue;
		}

		const accountId: string = String(entry.id);

		for (const event of entry.messaging) {
			const message = isObject(event) ? event.message : undefined;

			if (
				!isObject(message) ||
				typeof message.mid !== 'string' ||
				message.is_deleted === true
			) {
				continue;
			}

			// The person of the conversation: who wrote, or who the account wrote to.
			const isEcho: boolean = message.is_echo === true;
			const igsid: unknown = isEcho ? event.recipient?.id : event.sender?.id;
			const sender: unknown = event.sender?.id;

			if (
				typeof igsid !== 'string' ||
				igsid === accountId ||
				(isEcho ? sender !== accountId : sender === accountId)
			) {
				continue;
			}

			const attachments: IInstagramAttachment[] = readAttachments(
				message.attachments,
			);
			const text: string | null =
				typeof message.text === 'string' ? message.text : null;

			messages.push({
				accountId,
				igsid,
				direction: isEcho
					? InstagramEnum.Direction.OUT
					: InstagramEnum.Direction.IN,
				mid: message.mid,
				text,
				attachments,
				// Nothing readable came: a like, a share, something Instagram does not carry.
				isUnsupported:
					message.is_unsupported === true || (!text && !attachments.length),
				sentAt: new Date(
					typeof event.timestamp === 'number' ? event.timestamp : Date.now(),
				),
				raw: event,
			});
		}
	}

	return messages;
};
