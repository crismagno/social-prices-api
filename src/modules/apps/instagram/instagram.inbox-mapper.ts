import InboxEnum from '../../inbox/interfaces/inbox.enum';
import {
	IInboxAttachment,
	IInboxContact,
	IInboxConversation,
	IInboxMessage,
	IInboxMessageInput,
	IInboxPreview,
} from '../../inbox/interfaces/inbox.types';
import { IInstagramChat } from './instagram-chat.interface';
import { IInstagramMessageRecord } from './instagram-message.interface';
import InstagramEnum from './instagram.enum';
import {
	IInstagramAttachment,
	IInstagramProfile,
	INormalizedInstagramMessage,
} from './instagram.types';

const PREVIEW_LENGTH: number = 120;
const UNSUPPORTED: string = 'unsupported';

/** Instagram's own names for what a file is, in the inbox's common vocabulary. */
const KIND_BY_TYPE: Record<string, InboxEnum.MessageKind> = {
	image: InboxEnum.MessageKind.IMAGE,
	video: InboxEnum.MessageKind.VIDEO,
	audio: InboxEnum.MessageKind.AUDIO,
	file: InboxEnum.MessageKind.FILE,
	share: InboxEnum.MessageKind.SHARE,
	story_mention: InboxEnum.MessageKind.SHARE,
	ig_reel: InboxEnum.MessageKind.SHARE,
	reel: InboxEnum.MessageKind.SHARE,
	[UNSUPPORTED]: InboxEnum.MessageKind.UNSUPPORTED,
};

export const kindOf = (attachmentType: string | null): InboxEnum.MessageKind =>
	attachmentType
		? KIND_BY_TYPE[attachmentType] ?? InboxEnum.MessageKind.OTHER
		: InboxEnum.MessageKind.TEXT;

/** What the last message was, when it has no text to show: a file, or something unsupported. */
export const attachmentTypeOf = (
	message: Pick<INormalizedInstagramMessage, 'attachments' | 'isUnsupported'>,
): string | null =>
	message.attachments[0]?.type ?? (message.isUnsupported ? UNSUPPORTED : null);

const attachmentOf = (attachment: IInstagramAttachment): IInboxAttachment => ({
	kind: kindOf(attachment.type),
	mimeType: null,
	fileName: null,
	size: null,
	width: null,
	height: null,
	duration: null,
	source: { type: InboxEnum.AttachmentSourceType.URL, url: attachment.url },
});

/** A message of the account's conversation in the common shape, Instagram's file names in `channelData`. */
export const inboxInputOf = (
	message: Pick<
		INormalizedInstagramMessage,
		'mid' | 'text' | 'attachments' | 'isUnsupported' | 'sentAt'
	> & {
		igsid: string;
		raw?: unknown;
		sentByEmployeeId?: string | null;
		isIncoming?: boolean;
	},
): IInboxMessageInput => ({
	channelMessageId: message.mid,
	kind: kindOf(attachmentTypeOf(message)),
	text: message.text,
	attachments: message.attachments.map(attachmentOf),
	sentAt: message.sentAt,
	sender: message.isIncoming
		? { id: message.igsid, name: null, username: null }
		: null,
	isUnsupported: message.isUnsupported,
	...(message.sentByEmployeeId !== undefined
		? { sentByEmployeeId: message.sentByEmployeeId }
		: {}),
	channelData: {
		attachmentTypes: message.attachments.map(
			(attachment: IInstagramAttachment) => attachment.type,
		),
	},
	...(message.raw !== undefined ? { raw: message.raw } : {}),
});

export const contactOf = (
	profile: IInstagramProfile,
): Partial<IInboxContact> => ({
	name: profile.name,
	username: profile.username,
	profilePic: profile.profilePic,
});

export const previewOf = (
	text: string | null,
	attachmentType: string | null,
	direction: InstagramEnum.Direction,
	at: Date,
): IInboxPreview => ({
	text: text === null ? null : text.slice(0, PREVIEW_LENGTH),
	kind: kindOf(attachmentType),
	channelKind: attachmentType,
	direction: direction as unknown as InboxEnum.Direction,
	at,
});

/** The inbox's conversation as the Instagram app has always seen a chat. */
export const toInstagramChat = (
	conversation: IInboxConversation,
): IInstagramChat => ({
	_id: conversation._id,
	ownerUserId: conversation.ownerUserId,
	accountId: conversation.accountKey,
	igsid: conversation.contactKey,
	name: conversation.contact?.name ?? null,
	username: conversation.contact?.username ?? null,
	profilePic: conversation.contact?.profilePic ?? null,
	customerId: conversation.customerId,
	lastMessageAt: conversation.lastMessageAt,
	lastMessageText: conversation.lastMessageText,
	lastAttachmentType: conversation.lastMessageChannelKind,
	lastMessageDirection:
		conversation.lastMessageDirection as unknown as InstagramEnum.Direction,
	lastIncomingAt: conversation.lastIncomingAt,
	unreadCount: conversation.unreadCount,
	createdAt: conversation.createdAt,
	updatedAt: conversation.updatedAt,
});

/** The inbox's message as the Instagram app has always seen one. */
export const toInstagramMessage = (
	message: IInboxMessage,
	igsid: string,
): IInstagramMessageRecord => {
	const data = (message.channelData ?? {}) as Record<string, any>;
	const types: string[] = data.attachmentTypes ?? [];
	let index: number = 0;

	return {
		_id: message._id,
		ownerUserId: message.ownerUserId,
		direction: message.direction as unknown as InstagramEnum.Direction,
		igsid,
		mid: message.channelMessageId,
		text: message.text,
		attachments: (message.attachments ?? [])
			.filter(
				(attachment: IInboxAttachment) =>
					attachment.source?.type === InboxEnum.AttachmentSourceType.URL,
			)
			.map((attachment: IInboxAttachment) => ({
				type: types[index++] ?? 'file',
				url: (attachment.source as { url: string }).url,
			})),
		isUnsupported: message.isUnsupported,
		sentAt: message.sentAt,
		sentByEmployeeId: message.sentByEmployeeId,
		createdAt: message.createdAt,
	};
};
