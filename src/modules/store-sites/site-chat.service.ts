import { createHash, randomBytes } from 'crypto';
import mongoose, { Model, Types } from 'mongoose';

import {
	BadRequestException,
	Injectable,
	NotFoundException,
	UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../infra/database/mongo/schemas';
import { AppsRealtimeGateway } from '../apps/core/realtime/apps-realtime.gateway';
import AppsEnum from '../apps/interfaces/apps.enum';
import { InboxConversationsService } from '../inbox/inbox-conversations.service';
import { InboxMessagesService } from '../inbox/inbox-messages.service';
import { IInboxUploadFile } from '../inbox/inbox-channel.adapter';
import InboxEnum from '../inbox/interfaces/inbox.enum';
import {
	IInboxAttachment,
	IInboxConversation,
	IInboxMessage,
	IInboxMessageInput,
} from '../inbox/interfaces/inbox.types';
import {
	IStoreChatFile,
	StoreChatMediaService,
} from '../store-chat/store-chat-media.service';
import { StoreChatDeletionService } from '../store-chat/store-chat-deletion.service';
import { StoreChatEditionService } from '../store-chat/store-chat-edition.service';
import { SiteChatGuest } from './interfaces/site-chat-guest.schema';
import {
	ISiteChatAnswer,
	ISiteChatExtraField,
	IStoreSiteChat,
	IStoreSitePage,
} from './interfaces/store-site.interface';
import StoreSitesEnum from './interfaces/store-sites.enum';
import { IPublishedSiteContext } from './interfaces/store-sites.type';
import { SiteChatTypingState } from './site-chat-typing';
import { CHAT_FIELD_RULES } from './store-site-chat-fields';
import { SiteChatRateLimiter } from './site-chat-rate-limiter';
import { siteChatOf } from './store-site-chat';
import { sitePagesOf } from './store-site-pages';
import { StoreSitesPublicService } from './store-sites-public.service';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LENGTH = 80;
const MAX_EMAIL_LENGTH = 160;
const MAX_PHONE_LENGTH = 30;
const MAX_MESSAGE_LENGTH = 2000;
const MESSAGES_SHOWN = 100;

// How many chats one address may start, and one site may receive, a minute;
// how many messages one visitor may send.
const STARTS_PER_VISITOR = 5;
const STARTS_PER_SITE = 60;
const MESSAGES_PER_VISITOR = 30;
const FILES_PER_VISITOR = 10;
// The window says "writing" every few seconds at most; more is not a person typing.
const TYPING_PER_VISITOR = 30;

/** A file of a message as the visitor sees it: never where it is stored. */
export interface ISiteChatAttachmentView {
	kind: InboxEnum.MessageKind;
	mimeType: string | null;
	fileName: string | null;
	size: number | null;
}

/** One message as the visitor sees it: who wrote it and what, nothing more. */
export interface ISiteChatMessageView {
	id: string;
	fromStore: boolean;
	kind: InboxEnum.MessageKind;
	text: string | null;
	attachments: ISiteChatAttachmentView[];
	sentAt: Date;
	/** When its words were last changed; null when they never were. */
	editedAt: Date | null;
}

export interface ISiteChatVisitor {
	name?: unknown;
	email?: unknown;
	phone?: unknown;
	/** The answers to the owner's own fields, by the key of each field. */
	answers?: unknown;
}

/** What the form of the contact page sends. */
export interface ISiteContactForm extends ISiteChatVisitor {
	message?: unknown;
}

/** What of a visitor a message of theirs needs to reach the inbox. */
type TSiteChatSender = Pick<SiteChatGuest, 'name' | 'conversationId'> & {
	_id?: unknown;
};

/** Who a visitor said they are, already checked. */
interface ISiteChatIdentity {
	name: string;
	email: string | null;
	phone: string | null;
	answers?: ISiteChatAnswer[];
}

const isPhone = (value: string): boolean =>
	/\d{6,}/.test(value.replace(/\D/g, ''));

const hashOf = (token: string): string =>
	createHash('sha256').update(token).digest('hex');

const textOf = (value: unknown, max: number): string =>
	typeof value === 'string' ? value.trim().slice(0, max) : '';

/**
 * The chat of a store's site, from the visitor's side. A visitor without an
 * account tells who they are and gets a secret; each conversation is a chat
 * of the store's inbox, on the site channel, where the store answers.
 */
@Injectable()
export class SiteChatService {
	//#region Constructor

	constructor(
		@InjectModel(schemasName.siteChatGuest)
		private readonly _guestModel: Model<SiteChatGuest>,
		private readonly _storeSitesPublicService: StoreSitesPublicService,
		private readonly _conversations: InboxConversationsService,
		private readonly _messages: InboxMessagesService,
		private readonly _realtime: AppsRealtimeGateway,
		private readonly _limiter: SiteChatRateLimiter,
		private readonly _media: StoreChatMediaService,
		private readonly _typing: SiteChatTypingState,
		private readonly _edition: StoreChatEditionService,
		private readonly _deletion: StoreChatDeletionService,
	) {}

	//#endregion

	//#region Public Methods

	/** Opens a chat for a visitor: answers with the secret that reaches it later. */
	public async start(
		slug: string,
		visitorAddress: string,
		visitor: ISiteChatVisitor,
	): Promise<{ token: string }> {
		const { site, owner, store, chat } = await this._siteWithChatOrFail(slug);

		const name: string = textOf(visitor.name, MAX_NAME_LENGTH);
		const email: string | null = this._field(
			chat.emailField,
			textOf(visitor.email, MAX_EMAIL_LENGTH).toLowerCase(),
			(value: string) => EMAIL.test(value),
		);
		const phone: string | null = this._field(
			chat.phoneField,
			textOf(visitor.phone, MAX_PHONE_LENGTH),
			isPhone,
		);

		if (!name) {
			throw this._invalid('name');
		}

		const answers: ISiteChatAnswer[] = this._answers(
			chat.extraFields,
			visitor.answers,
		);

		this._assertMayStart(site.slug, visitorAddress);

		const { token, guest } = await this._open(
			{ site, owner, store },
			{ name, email, phone, answers },
		);

		// What the visitor told is the first thing the store reads, and the
		// conversation shows in its inbox at once.
		await this._receive(
			guest,
			String(owner._id),
			this._summary({ name, email, phone, answers }),
			[],
		);

		return { token };
	}

	/**
	 * The form of the contact page: a visitor says who they are and what they
	 * want, in one go, and it lands in the store's inbox as a conversation of
	 * the site. With the chat of the site on, the secret lets its window follow
	 * the answer; without it, the store answers by the e-mail that was given.
	 */
	public async contact(
		slug: string,
		visitorAddress: string,
		form: ISiteContactForm,
	): Promise<{ token: string | null }> {
		const context: IPublishedSiteContext =
			await this._storeSitesPublicService.resolvePublishedOrFail(slug);

		const hasContactPage: boolean = sitePagesOf(context.site.pages).some(
			(page: IStoreSitePage) =>
				page.type === StoreSitesEnum.SitePageType.CONTACT,
		);

		if (!hasContactPage) {
			throw new NotFoundException('Contact page not found!');
		}

		const name: string = textOf(form.name, MAX_NAME_LENGTH);
		const email: string = textOf(form.email, MAX_EMAIL_LENGTH).toLowerCase();
		const phone: string = textOf(form.phone, MAX_PHONE_LENGTH);
		const message: string =
			typeof form.message === 'string' ? form.message.trim() : '';

		if (!name) {
			throw this._invalid('name');
		}

		// Without the chat window, the e-mail is the only way back to the visitor.
		if (!EMAIL.test(email)) {
			throw this._invalid('email');
		}

		if (phone && !isPhone(phone)) {
			throw this._invalid('phone');
		}

		if (!message || message.length > MAX_MESSAGE_LENGTH) {
			throw this._invalid('text');
		}

		this._assertMayStart(context.site.slug, visitorAddress);

		const { token, guest } = await this._open(context, {
			name,
			email,
			phone: phone || null,
		});

		await this._receive(guest, String(context.owner._id), message, []);

		return { token: siteChatOf(context.site.chat).isActive ? token : null };
	}

	/** The conversation, oldest first, as the visitor sees it. */
	public async messages(
		slug: string,
		token: string,
	): Promise<ISiteChatMessageView[]> {
		const { guest, ownerUserId } = await this._guestOrFail(slug, token);

		const messages: IInboxMessage[] = await this._messages.listByConversation(
			ownerUserId,
			String(guest.conversationId),
			{ limit: MESSAGES_SHOWN },
		);

		return messages
			.map((message: IInboxMessage) => this._toView(message))
			.reverse();
	}

	/** The visitor is writing: the store's inbox shows it for a few seconds. */
	public async typing(slug: string, token: string): Promise<void> {
		const { guest, ownerUserId } = await this._guestOrFail(slug, token);

		this._limiter.assertAllowed(`typing:${guest._id}`, TYPING_PER_VISITOR);

		await this._touch(guest);

		this._realtime.notifyStoreChatTyping(ownerUserId, {
			storeId: String(guest.storeId),
			conversationId: String(guest.conversationId),
		});
	}

	/** Whether the store is writing to this visitor right now. */
	public async storeTyping(
		slug: string,
		token: string,
	): Promise<{ isStoreTyping: boolean }> {
		const { guest } = await this._guestOrFail(slug, token);

		return {
			isStoreTyping: this._typing.isTyping(String(guest.conversationId)),
		};
	}

	/** What the visitor writes, as a message to the store's inbox. */
	public async send(
		slug: string,
		token: string,
		rawText: unknown,
	): Promise<ISiteChatMessageView> {
		const text: string = typeof rawText === 'string' ? rawText.trim() : '';

		if (!text || text.length > MAX_MESSAGE_LENGTH) {
			throw this._invalid('text');
		}

		const { guest, ownerUserId } = await this._guestOrFail(slug, token);

		this._limiter.assertAllowed(`message:${guest._id}`, MESSAGES_PER_VISITOR);

		await this._touch(guest);

		return await this._receive(guest, ownerUserId, text, []);
	}

	/** A file or a recording of the visitor, with its words when there are any. */
	public async sendMedia(
		slug: string,
		token: string,
		file: IInboxUploadFile,
		options: { caption: unknown; asVoice: boolean },
	): Promise<ISiteChatMessageView> {
		const { guest, ownerUserId } = await this._guestOrFail(slug, token);

		const caption: string | null = this._media.caption(options.caption);

		this._limiter.assertAllowed(`message:${guest._id}`, MESSAGES_PER_VISITOR);
		this._limiter.assertAllowed(`file:${guest._id}`, FILES_PER_VISITOR);

		await this._touch(guest);

		const attachment: IInboxAttachment = await this._media.store(
			file,
			options.asVoice === true,
		);

		return await this._receive(guest, ownerUserId, caption, [attachment]);
	}

	/** New words for a message the visitor wrote (or for its file's caption). */
	public async editMessage(
		slug: string,
		token: string,
		messageId: string,
		rawText: unknown,
	): Promise<ISiteChatMessageView> {
		const text: string = typeof rawText === 'string' ? rawText.trim() : '';

		if (!text || text.length > MAX_MESSAGE_LENGTH) {
			throw this._invalid('text');
		}

		const { guest, ownerUserId } = await this._guestOrFail(slug, token);

		this._limiter.assertAllowed(`message:${guest._id}`, MESSAGES_PER_VISITOR);

		await this._touch(guest);

		const edited: IInboxMessage = await this._edition.edit(
			await this._conversationOf(guest, ownerUserId),
			messageId,
			InboxEnum.Direction.IN,
			text,
		);

		return this._toView(edited);
	}

	/** Removes a message the visitor wrote; it is gone for the store too. */
	public async deleteMessage(
		slug: string,
		token: string,
		messageId: string,
	): Promise<void> {
		const { guest, ownerUserId } = await this._guestOrFail(slug, token);

		await this._touch(guest);

		await this._deletion.remove(
			await this._conversationOf(guest, ownerUserId),
			messageId,
			InboxEnum.Direction.IN,
		);
	}

	/** One file of a message, only of the visitor's own conversation. */
	public async attachment(
		slug: string,
		token: string,
		messageId: string,
		index: number,
	): Promise<IStoreChatFile> {
		const { guest, ownerUserId } = await this._guestOrFail(slug, token);

		const message: IInboxMessage | null = Types.ObjectId.isValid(messageId)
			? await this._messages.findOwned(
					ownerUserId,
					String(guest.conversationId),
					messageId,
			  )
			: null;

		if (!message) {
			throw new NotFoundException('Attachment not found.');
		}

		return await this._media.read(message, index);
	}

	//#endregion

	//#region Private Methods

	private _assertMayStart(siteSlug: string, visitorAddress: string): void {
		this._limiter.assertAllowed(
			`start:${visitorAddress || 'unknown'}`,
			STARTS_PER_VISITOR,
		);
		this._limiter.assertAllowed(`start-site:${siteSlug}`, STARTS_PER_SITE);
	}

	/** A new visitor and their conversation in the store's inbox, still empty. */
	private async _open(
		{ site, owner, store }: IPublishedSiteContext,
		{ name, email, phone, answers }: ISiteChatIdentity,
	): Promise<{ token: string; guest: TSiteChatSender }> {
		const ownerUserId: string = String(owner._id);
		const storeId: string = String(store._id);

		const token: string = randomBytes(32).toString('base64url');

		const guest = await this._guestModel.create({
			ownerUserId: new Types.ObjectId(ownerUserId),
			storeId: new Types.ObjectId(storeId),
			tokenHash: hashOf(token),
			lastActiveAt: new Date(),
			conversationId: null,
			name,
			email,
			phone,
			answers: answers ?? [],
		});

		const { conversation } = await this._conversations.ensure(
			ownerUserId,
			{ channel: InboxEnum.Channel.SITE, contactKey: String(guest._id) },
			{
				accountKey: storeId,
				contact: {
					name,
					extra: {
						email,
						phone,
						answers: answers ?? [],
						storeName: store.name,
						siteSlug: site.slug,
					},
				},
			},
		);

		await this._guestModel.updateOne(
			{ _id: guest._id },
			{ $set: { conversationId: conversation._id } },
		);

		return {
			token,
			guest: {
				_id: guest._id,
				name,
				conversationId:
					conversation._id as unknown as SiteChatGuest['conversationId'],
			},
		};
	}

	/** Records a message of the visitor in the store's inbox and tells it. */
	private async _receive(
		guest: TSiteChatSender,
		ownerUserId: string,
		text: string | null,
		attachments: IInboxAttachment[],
	): Promise<ISiteChatMessageView> {
		const conversationId: string = String(guest.conversationId);
		const kind: InboxEnum.MessageKind =
			attachments[0]?.kind ?? InboxEnum.MessageKind.TEXT;

		const conversation = {
			_id: conversationId,
			channel: InboxEnum.Channel.SITE,
		};

		const input: IInboxMessageInput = {
			channelMessageId: new mongoose.Types.ObjectId().toString(),
			kind,
			text,
			attachments,
			sentAt: new Date(),
			sender: { id: String(guest._id), name: guest.name, username: null },
		};

		await this._messages.saveIncoming(ownerUserId, conversation, input);

		await this._conversations.applyIncoming(ownerUserId, conversationId, {
			preview: {
				text,
				kind,
				channelKind: null,
				direction: InboxEnum.Direction.IN,
				at: input.sentAt,
			},
		});

		this._realtime.notifyInboxUpdated(
			ownerUserId,
			AppsEnum.App.SITE,
			conversationId,
		);

		// Its own id, as the list gives it: the one it is changed and removed by.
		const saved: IInboxMessage | null =
			await this._messages.findByChannelMessageId(
				ownerUserId,
				conversationId,
				input.channelMessageId,
			);

		return {
			id: saved ? String(saved._id) : input.channelMessageId,
			fromStore: false,
			kind,
			text,
			attachments: attachments.map(this._attachmentView),
			sentAt: input.sentAt,
			editedAt: null,
		};
	}

	private _attachmentView(
		attachment: IInboxAttachment,
	): ISiteChatAttachmentView {
		return {
			kind: attachment.kind,
			mimeType: attachment.mimeType ?? null,
			fileName: attachment.fileName ?? null,
			size: attachment.size ?? null,
		};
	}

	private async _siteWithChatOrFail(
		slug: string,
	): Promise<IPublishedSiteContext & { chat: IStoreSiteChat }> {
		const context: IPublishedSiteContext =
			await this._storeSitesPublicService.resolvePublishedOrFail(slug);

		const chat: IStoreSiteChat = siteChatOf(context.site.chat);

		if (!chat.isActive) {
			throw new NotFoundException('Chat not found!');
		}

		return { ...context, chat };
	}

	private async _guestOrFail(
		slug: string,
		token: string,
	): Promise<{ guest: SiteChatGuest; ownerUserId: string }> {
		const { store, chat } = await this._siteWithChatOrFail(slug);

		// Found only through the secret, and only on this site's store.
		const guest: SiteChatGuest | null =
			typeof token === 'string' && token.length >= 32
				? await this._guestModel.findOne({
						tokenHash: hashOf(token),
						storeId: new Types.ObjectId(String(store._id)),
				  })
				: null;

		if (!guest?.conversationId) {
			throw new UnauthorizedException({
				code: 'SITE_CHAT_UNKNOWN_VISITOR',
				message: 'This chat is not known.',
			});
		}

		// Too long without writing (the owner chose how long): the window starts
		// a new chat. The old one stays in the store's inbox.
		const lastActiveAt: Date | null =
			guest.lastActiveAt ?? guest.createdAt ?? null;

		if (
			lastActiveAt &&
			Date.now() - new Date(lastActiveAt).getTime() >
				chat.sessionMinutes * 60 * 1000
		) {
			throw new UnauthorizedException({
				code: 'SITE_CHAT_EXPIRED',
				message: 'This chat has ended.',
			});
		}

		return { guest, ownerUserId: String(guest.ownerUserId) };
	}

	/** The visitor's own conversation: only its messages can be changed. */
	private async _conversationOf(
		guest: SiteChatGuest,
		ownerUserId: string,
	): Promise<IInboxConversation> {
		const conversation: IInboxConversation | null =
			await this._conversations.findById(
				ownerUserId,
				String(guest.conversationId),
			);

		if (!conversation) {
			throw new NotFoundException('Message not found.');
		}

		return conversation;
	}

	/** The visitor wrote: the chat stays theirs for the owner's time again. */
	private async _touch(guest: SiteChatGuest): Promise<void> {
		await this._guestModel.updateOne(
			{ _id: guest._id },
			{ $set: { lastActiveAt: new Date() } },
		);
	}

	/** The answers to the customer fields the owner asks, each checked by its rule. */
	private _answers(
		fields: ISiteChatExtraField[],
		raw: unknown,
	): ISiteChatAnswer[] {
		const given: Record<string, unknown> =
			raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

		return fields
			.map(
				({
					field,
					isRequired,
				}: ISiteChatExtraField): ISiteChatAnswer | null => {
					const rule = CHAT_FIELD_RULES[field];

					if (!rule) {
						return null;
					}

					const value: string = textOf(given[field], rule.maxLength);

					if (!value) {
						if (isRequired) {
							throw this._invalid(field);
						}

						return null;
					}

					if (!rule.isValid(value)) {
						throw this._invalid(field);
					}

					return { field, label: rule.label, value };
				},
			)
			.filter(
				(answer: ISiteChatAnswer | null): answer is ISiteChatAnswer => !!answer,
			);
	}

	/** Who the visitor is and what they answered, as the store reads it. */
	private _summary({ name, email, phone, answers }: ISiteChatIdentity): string {
		return [
			`👤 ${name}`,
			email && `✉️ ${email}`,
			phone && `📞 ${phone}`,
			...(answers ?? []).map(
				(answer: ISiteChatAnswer) =>
					`${answer.label}: ${
						CHAT_FIELD_RULES[answer.field]?.shown?.(answer.value) ??
						answer.value
					}`,
			),
		]
			.filter(Boolean)
			.join('\n');
	}

	/** A field of the form as the store asks it: required, optional or not asked. */
	private _field(
		mode: StoreSitesEnum.ChatFieldMode,
		value: string,
		isValid: (value: string) => boolean,
	): string | null {
		if (mode === StoreSitesEnum.ChatFieldMode.HIDDEN) {
			return null;
		}

		if (!value) {
			if (mode === StoreSitesEnum.ChatFieldMode.REQUIRED) {
				throw this._invalid('required');
			}

			return null;
		}

		if (!isValid(value)) {
			throw this._invalid('format');
		}

		return value;
	}

	private _invalid(field: string): BadRequestException {
		return new BadRequestException({
			code: 'SITE_CHAT_INVALID',
			message: 'Check the fields of the chat.',
			field,
		});
	}

	private _toView(message: IInboxMessage): ISiteChatMessageView {
		return {
			id: String(message._id),
			fromStore: message.direction === InboxEnum.Direction.OUT,
			kind: message.kind ?? InboxEnum.MessageKind.TEXT,
			text: message.text ?? null,
			attachments: (message.attachments ?? []).map(this._attachmentView),
			sentAt: message.sentAt,
			editedAt: message.editedAt ?? null,
		};
	}

	//#endregion
}
