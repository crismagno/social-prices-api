import InboxEnum from '../../inbox/interfaces/inbox.enum';
import {
	IInboxContact,
	IInboxMessageInput,
	IInboxPreview,
} from '../../inbox/interfaces/inbox.types';
import { INormalizedWhatsappMessage, IWhatsappMedia } from './whatsapp.types';

const PREVIEW_LENGTH: number = 120;

/** WhatsApp's own names for what a message is, in the inbox's common vocabulary. */
export const kindOf = (
	type: string,
	media: IWhatsappMedia | null,
	isUnsupported: boolean = false,
): InboxEnum.MessageKind => {
	if (isUnsupported) {
		return InboxEnum.MessageKind.UNSUPPORTED;
	}

	switch (type) {
		case 'image':
			return InboxEnum.MessageKind.IMAGE;
		case 'video':
			return InboxEnum.MessageKind.VIDEO;
		case 'audio':
			return media?.isVoice
				? InboxEnum.MessageKind.VOICE
				: InboxEnum.MessageKind.AUDIO;
		case 'document':
			return InboxEnum.MessageKind.FILE;
		case 'sticker':
			return InboxEnum.MessageKind.STICKER;
		case 'location':
			return InboxEnum.MessageKind.LOCATION;
		case 'contacts':
			return InboxEnum.MessageKind.CONTACT;
		default:
			return InboxEnum.MessageKind.TEXT;
	}
};

/** A message in the common shape: the file by its WhatsApp id, the event as it came. */
export const inboxInputOf = (
	message: INormalizedWhatsappMessage,
): IInboxMessageInput => {
	const kind: InboxEnum.MessageKind = kindOf(
		message.type,
		message.media,
		message.isUnsupported,
	);

	return {
		channelMessageId: message.mid,
		kind,
		text: message.text,
		attachments: message.media
			? [
					{
						kind,
						mimeType: message.media.mimeType,
						fileName: message.media.fileName,
						size: null,
						width: null,
						height: null,
						duration: null,
						source: {
							type: InboxEnum.AttachmentSourceType.WHATSAPP_MEDIA,
							mediaId: message.media.id,
						},
					},
			  ]
			: [],
		sentAt: message.sentAt,
		sender: { id: message.waId, name: message.profileName, username: null },
		isUnsupported: message.isUnsupported,
		channelData: { type: message.type },
		raw: message.raw,
	};
};

export const contactOf = (
	message: INormalizedWhatsappMessage,
): Partial<IInboxContact> => ({
	name: message.profileName,
	username: null,
	extra: { waId: message.waId },
});

export const previewOf = (
	text: string | null,
	kind: InboxEnum.MessageKind,
	channelKind: string | null,
	direction: InboxEnum.Direction,
	at: Date,
): IInboxPreview => ({
	text: text === null ? null : text.slice(0, PREVIEW_LENGTH),
	kind,
	channelKind,
	direction,
	at,
});
