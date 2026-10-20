import InboxEnum from '../../inbox/interfaces/inbox.enum';
import {
	IInboxAttachment,
	IInboxContact,
	IInboxConversation,
	IInboxMessage,
	IInboxMessageInput,
	IInboxPreview,
} from '../../inbox/interfaces/inbox.types';
import { IMessengerChat } from './messenger-chat.interface';
import { IMessengerMessageRecord } from './messenger-message.interface';
import MessengerEnum from './messenger.enum';
import {
	IMessengerAttachment,
	IMessengerLocalAttachment,
	INormalizedMessengerMessage,
} from './messenger.types';

const PREVIEW_LENGTH: number = 120;

/** Facebook's own names for what a file is, in the inbox's common vocabulary. */
const KIND_BY_TYPE: Record<string, InboxEnum.MessageKind> = {
	image: InboxEnum.MessageKind.IMAGE,
	video: InboxEnum.MessageKind.VIDEO,
	audio: InboxEnum.MessageKind.AUDIO,
	file: InboxEnum.MessageKind.FILE,
	location: InboxEnum.MessageKind.LOCATION,
};

export const kindOf = (attachmentType: string | null): InboxEnum.MessageKind =>
	attachmentType
		? KIND_BY_TYPE[attachmentType] ?? InboxEnum.MessageKind.OTHER
		: InboxEnum.MessageKind.TEXT;

const attachmentOf = (attachment: IMessengerAttachment): IInboxAttachment => ({
	kind: kindOf(attachment.type),
	mimeType: null,
	fileName: null,
	size: null,
	width: null,
	height: null,
	duration: null,
	source: { type: InboxEnum.AttachmentSourceType.URL, url: attachment.url },
});

/**
 * A message of the Page conversation in the common shape. Facebook's names for the
 * files, and a file sent from here that has no address yet, ride in `channelData`.
 */
export const inboxInputOf = (
	message: Pick<
		INormalizedMessengerMessage,
		'mid' | 'text' | 'attachments' | 'sentAt'
	> & {
		psid: string;
		raw?: unknown;
		localAttachment?: IMessengerLocalAttachment;
		sentByEmployeeId?: string | null;
		isIncoming?: boolean;
	},
): IInboxMessageInput => {
	const type: string | null =
		message.attachments[0]?.type ?? message.localAttachment?.type ?? null;

	return {
		channelMessageId: message.mid,
		kind: kindOf(type),
		text: message.text,
		attachments: message.attachments.map(attachmentOf),
		sentAt: message.sentAt,
		sender: message.isIncoming
			? { id: message.psid, name: null, username: null }
			: null,
		...(message.sentByEmployeeId !== undefined
			? { sentByEmployeeId: message.sentByEmployeeId }
			: {}),
		channelData: {
			attachmentTypes: message.attachments.map(
				(attachment: IMessengerAttachment) => attachment.type,
			),
			...(message.localAttachment
				? { localAttachment: message.localAttachment }
				: {}),
		},
		...(message.raw !== undefined ? { raw: message.raw } : {}),
	};
};

export const contactOf = (profile: {
	name: string | null;
	profilePic: string | null;
}): Partial<IInboxContact> => ({
	name: profile.name,
	profilePic: profile.profilePic,
});

export const previewOf = (
	text: string | null,
	attachmentType: string | null,
	direction: MessengerEnum.Direction,
	at: Date,
): IInboxPreview => ({
	text: text === null ? null : text.slice(0, PREVIEW_LENGTH),
	kind: kindOf(attachmentType),
	channelKind: attachmentType,
	direction: direction as unknown as InboxEnum.Direction,
	at,
});

/** The inbox's conversation as the Messenger app has always seen a chat. */
export const toMessengerChat = (
	conversation: IInboxConversation,
): IMessengerChat => ({
	_id: conversation._id,
	ownerUserId: conversation.ownerUserId,
	pageId: conversation.accountKey,
	psid: conversation.contactKey,
	name: conversation.contact?.name ?? null,
	profilePic: conversation.contact?.profilePic ?? null,
	customerId: conversation.customerId,
	lastMessageAt: conversation.lastMessageAt,
	lastMessageText: conversation.lastMessageText,
	lastAttachmentType: conversation.lastMessageChannelKind,
	lastMessageDirection:
		conversation.lastMessageDirection as unknown as MessengerEnum.Direction,
	lastIncomingAt: conversation.lastIncomingAt,
	unreadCount: conversation.unreadCount,
	createdAt: conversation.createdAt,
	updatedAt: conversation.updatedAt,
});

/** The inbox's message as the Messenger app has always seen one. */
export const toMessengerMessage = (
	message: IInboxMessage,
	psid: string,
): IMessengerMessageRecord => {
	const data = (message.channelData ?? {}) as Record<string, any>;
	const types: string[] = data.attachmentTypes ?? [];
	let index: number = 0;

	const attachments: IMessengerAttachment[] = (message.attachments ?? [])
		.filter(
			(attachment: IInboxAttachment) =>
				attachment.source?.type === InboxEnum.AttachmentSourceType.URL,
		)
		.map((attachment: IInboxAttachment) => ({
			type: types[index++] ?? 'file',
			url: (attachment.source as { url: string }).url,
		}));

	return {
		_id: message._id,
		ownerUserId: message.ownerUserId,
		direction: message.direction as unknown as MessengerEnum.Direction,
		psid,
		mid: message.channelMessageId,
		text: message.text,
		attachments,
		...(data.localAttachment ? { localAttachment: data.localAttachment } : {}),
		sentAt: message.sentAt,
		sentByEmployeeId: message.sentByEmployeeId,
		createdAt: message.createdAt,
	};
};
