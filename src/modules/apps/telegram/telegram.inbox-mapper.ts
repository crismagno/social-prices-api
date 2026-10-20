import InboxEnum from '../../inbox/interfaces/inbox.enum';
import {
	IInboxAttachment,
	IInboxContact,
	IInboxConversation,
	IInboxMessage,
	IInboxMessageInput,
	IInboxPreview,
} from '../../inbox/interfaces/inbox.types';
import { ITelegramChat } from './telegram-chat.interface';
import { ITelegramMessageRecord } from './telegram-message.interface';
import TelegramEnum from './telegram.enum';
import { INormalizedTelegramMessage, ITelegramMedia } from './telegram.types';

/** Telegram's own names for what a message is, in the inbox's common vocabulary. */
const KIND_BY_CONTENT_TYPE: Record<
	TelegramEnum.ContentType,
	InboxEnum.MessageKind
> = {
	[TelegramEnum.ContentType.TEXT]: InboxEnum.MessageKind.TEXT,
	[TelegramEnum.ContentType.PHOTO]: InboxEnum.MessageKind.IMAGE,
	[TelegramEnum.ContentType.DOCUMENT]: InboxEnum.MessageKind.FILE,
	[TelegramEnum.ContentType.VOICE]: InboxEnum.MessageKind.VOICE,
	[TelegramEnum.ContentType.AUDIO]: InboxEnum.MessageKind.AUDIO,
	[TelegramEnum.ContentType.VIDEO]: InboxEnum.MessageKind.VIDEO,
	[TelegramEnum.ContentType.VIDEO_NOTE]: InboxEnum.MessageKind.VIDEO,
	[TelegramEnum.ContentType.STICKER]: InboxEnum.MessageKind.STICKER,
	[TelegramEnum.ContentType.LOCATION]: InboxEnum.MessageKind.LOCATION,
	[TelegramEnum.ContentType.CONTACT]: InboxEnum.MessageKind.CONTACT,
	[TelegramEnum.ContentType.OTHER]: InboxEnum.MessageKind.OTHER,
};

/** The way back, for a message that did not keep the Telegram content type. */
const CONTENT_TYPE_BY_KIND: Partial<
	Record<InboxEnum.MessageKind, TelegramEnum.ContentType>
> = {
	[InboxEnum.MessageKind.TEXT]: TelegramEnum.ContentType.TEXT,
	[InboxEnum.MessageKind.IMAGE]: TelegramEnum.ContentType.PHOTO,
	[InboxEnum.MessageKind.FILE]: TelegramEnum.ContentType.DOCUMENT,
	[InboxEnum.MessageKind.VOICE]: TelegramEnum.ContentType.VOICE,
	[InboxEnum.MessageKind.AUDIO]: TelegramEnum.ContentType.AUDIO,
	[InboxEnum.MessageKind.VIDEO]: TelegramEnum.ContentType.VIDEO,
	[InboxEnum.MessageKind.STICKER]: TelegramEnum.ContentType.STICKER,
	[InboxEnum.MessageKind.LOCATION]: TelegramEnum.ContentType.LOCATION,
	[InboxEnum.MessageKind.CONTACT]: TelegramEnum.ContentType.CONTACT,
};

export const kindOf = (
	contentType: TelegramEnum.ContentType,
): InboxEnum.MessageKind =>
	KIND_BY_CONTENT_TYPE[contentType] ?? InboxEnum.MessageKind.OTHER;

const attachmentOf = (
	media: ITelegramMedia,
	contentType: TelegramEnum.ContentType,
): IInboxAttachment => ({
	kind: kindOf(contentType),
	mimeType: media.mimeType,
	fileName: media.fileName,
	size: media.size,
	width: media.width,
	height: media.height,
	duration: media.duration,
	source: {
		type: InboxEnum.AttachmentSourceType.TELEGRAM_FILE,
		fileId: media.fileId,
	},
});

const fullName = (first: string | null, last: string | null): string | null =>
	[first, last].filter(Boolean).join(' ') || null;

/** A customer's message (or what was sent from here) in the common shape. */
export const inboxInputOf = (
	message: INormalizedTelegramMessage & {
		sentByEmployeeId?: string | null;
		raw?: unknown;
	},
): IInboxMessageInput => {
	const isIncoming: boolean = message.fromUserId !== undefined;
	const contentType: TelegramEnum.ContentType =
		message.contentType ?? TelegramEnum.ContentType.TEXT;

	return {
		channelMessageId: String(message.messageId),
		kind: kindOf(contentType),
		text: message.text ?? null,
		attachments: message.media
			? [attachmentOf(message.media, contentType)]
			: [],
		sentAt: message.sentAt,
		sender: isIncoming
			? {
					id: String(message.fromUserId),
					name: fullName(message.fromFirstName, message.fromLastName),
					username: message.fromUsername,
			  }
			: null,
		...(message.sentByEmployeeId !== undefined
			? { sentByEmployeeId: message.sentByEmployeeId }
			: {}),
		channelData: {
			contentType,
			...(isIncoming
				? {
						updateId: message.updateId,
						fromLanguageCode: message.fromLanguageCode,
				  }
				: {}),
		},
		...(isIncoming ? { raw: message.raw } : {}),
	};
};

/** What Telegram says about the person, as the inbox keeps it. */
export const contactOf = (
	message: INormalizedTelegramMessage,
): Partial<IInboxContact> => ({
	name: fullName(message.fromFirstName, message.fromLastName),
	username: message.fromUsername,
	languageCode: message.fromLanguageCode,
	extra: {
		telegramUserId: message.fromUserId,
		firstName: message.fromFirstName,
		lastName: message.fromLastName,
	},
});

export const previewOf = (
	text: string | null,
	contentType: TelegramEnum.ContentType,
	direction: TelegramEnum.Direction,
	at: Date,
): IInboxPreview => ({
	text,
	kind: kindOf(contentType),
	channelKind: contentType,
	direction: direction as unknown as InboxEnum.Direction,
	at,
});

/** The inbox's conversation as the Telegram app has always seen a chat. */
export const toTelegramChat = (
	conversation: IInboxConversation,
): ITelegramChat => {
	const extra = (conversation.contact?.extra ?? {}) as Record<string, any>;
	const contentType: TelegramEnum.ContentType =
		(conversation.lastMessageChannelKind as TelegramEnum.ContentType) ??
		TelegramEnum.ContentType.TEXT;

	return {
		_id: conversation._id,
		ownerUserId: conversation.ownerUserId,
		chatId: Number(conversation.contactKey),
		telegramUserId: extra.telegramUserId,
		firstName: extra.firstName ?? null,
		lastName: extra.lastName ?? null,
		username: conversation.contact?.username ?? null,
		languageCode: conversation.contact?.languageCode ?? null,
		customerId: conversation.customerId,
		lastMessageAt: conversation.lastMessageAt,
		// The app shows "[PHOTO]" for a message without text and translates it.
		lastMessageText:
			conversation.lastMessageText ??
			(conversation.lastMessageChannelKind
				? `[${conversation.lastMessageChannelKind}]`
				: null),
		lastMessageDirection:
			conversation.lastMessageDirection as unknown as TelegramEnum.Direction,
		lastContentType: contentType,
		unreadCount: conversation.unreadCount,
		createdAt: conversation.createdAt,
		updatedAt: conversation.updatedAt,
	};
};

/** The inbox's message as the Telegram app has always seen one. */
export const toTelegramMessage = (
	message: IInboxMessage,
	chatId: number,
): ITelegramMessageRecord => {
	const data = (message.channelData ?? {}) as Record<string, any>;
	const file: IInboxAttachment | undefined = message.attachments?.find(
		(attachment: IInboxAttachment) =>
			attachment.source?.type === InboxEnum.AttachmentSourceType.TELEGRAM_FILE,
	);

	return {
		_id: message._id,
		ownerUserId: message.ownerUserId,
		direction: message.direction as unknown as TelegramEnum.Direction,
		chatId,
		messageId: Number(message.channelMessageId),
		contentType:
			data.contentType ??
			CONTENT_TYPE_BY_KIND[message.kind] ??
			TelegramEnum.ContentType.OTHER,
		text: message.text,
		...(file &&
		file.source.type === InboxEnum.AttachmentSourceType.TELEGRAM_FILE
			? {
					media: {
						fileId: file.source.fileId,
						fileName: file.fileName,
						mimeType: file.mimeType,
						size: file.size,
						width: file.width,
						height: file.height,
						duration: file.duration,
					},
			  }
			: {}),
		sentAt: message.sentAt,
		...(data.updateId !== undefined ? { updateId: data.updateId } : {}),
		sentByEmployeeId: message.sentByEmployeeId,
		createdAt: message.createdAt,
	};
};
