import {
	BadRequestException,
	HttpException,
	NotFoundException,
	ServiceUnavailableException,
	UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { Types } from 'mongoose';

import InboxEnum from '../inbox/interfaces/inbox.enum';
import StoreSitesEnum from './interfaces/store-sites.enum';
import { SiteChatService } from './site-chat.service';

const OWNER = new Types.ObjectId().toString();
const STORE = new Types.ObjectId().toString();
const CONVERSATION = new Types.ObjectId().toString();
const GUEST = new Types.ObjectId().toString();

// As the service makes them: 32 random bytes, base64url.
const TOKEN = 'A'.repeat(43);

const STORED = {
	kind: InboxEnum.MessageKind.VOICE,
	mimeType: 'audio/webm',
	fileName: 'voz.webm',
	size: 1200,
	width: null,
	height: null,
	duration: null,
	source: { type: InboxEnum.AttachmentSourceType.STORED_FILE, key: 'chat/k1' },
};

const FILE = {
	buffer: Buffer.from('audio'),
	fileName: 'voz.webm',
	mimeType: 'audio/webm',
};

const hash = (token: string): string =>
	createHash('sha256').update(token).digest('hex');

const chatOn = (patch: any = {}) => ({
	isActive: true,
	emailField: StoreSitesEnum.ChatFieldMode.REQUIRED,
	phoneField: StoreSitesEnum.ChatFieldMode.OPTIONAL,
	...patch,
});

const build = ({
	chat = chatOn(),
	guest = null as any,
	resolve,
	allow = true,
}: any = {}) => {
	const guestModel: any = {
		create: jest
			.fn()
			.mockImplementation((doc: any) =>
				Promise.resolve({ _id: GUEST, ...doc }),
			),
		findOne: jest.fn().mockResolvedValue(guest),
		updateOne: jest.fn().mockResolvedValue({}),
	};

	const publicService: any = {
		resolvePublishedOrFail:
			resolve ??
			jest.fn().mockResolvedValue({
				site: { slug: 'atelie', storeId: STORE, chat },
				owner: { _id: OWNER },
				store: { _id: STORE, name: 'Ateliê' },
			}),
	};

	const conversations: any = {
		ensure: jest.fn().mockResolvedValue({
			conversation: { _id: CONVERSATION, ownerUserId: OWNER },
			created: true,
		}),
		findById: jest.fn().mockResolvedValue({
			_id: CONVERSATION,
			ownerUserId: OWNER,
			channel: InboxEnum.Channel.SITE,
		}),
		applyIncoming: jest.fn().mockResolvedValue(true),
		markContactRead: jest.fn().mockResolvedValue(undefined),
	};

	const messages: any = {
		saveIncoming: jest.fn().mockResolvedValue(true),
		listByConversation: jest.fn().mockResolvedValue([
			{
				_id: 'm2',
				direction: InboxEnum.Direction.OUT,
				kind: InboxEnum.MessageKind.TEXT,
				text: 'Oi!',
				sentAt: new Date('2026-01-01T10:01:00Z'),
				sentByEmployeeId: 'secret',
			},
			{
				_id: 'm1',
				direction: InboxEnum.Direction.IN,
				kind: InboxEnum.MessageKind.TEXT,
				text: 'Tem em azul?',
				sentAt: new Date('2026-01-01T10:00:00Z'),
			},
		]),
	};

	messages.findByChannelMessageId = jest.fn().mockResolvedValue(null);

	messages.findOwned = jest.fn().mockResolvedValue({
		_id: 'm3',
		attachments: [STORED],
	});

	const realtime: any = {
		notifyInboxUpdated: jest.fn(),
		notifyStoreChatTyping: jest.fn(),
	};

	const typing: any = { isTyping: jest.fn().mockReturnValue(true) };

	const media: any = {
		store: jest.fn().mockResolvedValue(STORED),
		caption: jest.fn((text: unknown) =>
			typeof text === 'string' && text.trim() ? text.trim() : null,
		),
		read: jest.fn().mockResolvedValue({
			buffer: Buffer.from('audio'),
			contentType: 'audio/webm',
			fileName: 'voz.webm',
		}),
	};

	const edition: any = {
		edit: jest.fn().mockResolvedValue({
			_id: 'm1',
			direction: InboxEnum.Direction.IN,
			kind: InboxEnum.MessageKind.TEXT,
			text: 'Tem em verde?',
			sentAt: new Date('2026-01-01T10:00:00Z'),
			editedAt: new Date('2026-01-01T10:05:00Z'),
		}),
	};

	const deletion: any = { remove: jest.fn().mockResolvedValue(undefined) };

	const limiter: any = {
		assertAllowed: jest.fn(() => {
			if (!allow) {
				throw new HttpException('too many', 429);
			}
		}),
	};

	// Where a contact form goes when not to the inbox: it gets there unless told.
	const delivery = {
		email: jest.fn().mockResolvedValue(true),
		webhook: jest.fn().mockResolvedValue(true),
	};

	return {
		guestModel,
		conversations,
		messages,
		realtime,
		limiter,
		media,
		typing,
		edition,
		deletion,
		delivery,
		service: new SiteChatService(
			guestModel,
			publicService,
			conversations,
			messages,
			realtime,
			limiter,
			media,
			typing,
			edition,
			deletion,
			delivery as any,
		),
	};
};

const visitor = (patch: any = {}) => ({
	name: ' Ana Lima ',
	email: ' Ana@X.com ',
	phone: '',
	...patch,
});

describe('SiteChatService', () => {
	describe('start', () => {
		it('opens a conversation in the inbox of the store, on the site channel', async () => {
			const { service, conversations } = build();

			await service.start('atelie', '1.1.1.1', visitor());

			const [ownerUserId, key, init] = conversations.ensure.mock.calls[0];

			expect(ownerUserId).toBe(OWNER);
			expect(key).toEqual({
				channel: InboxEnum.Channel.SITE,
				contactKey: GUEST,
			});
			expect(init).toMatchObject({
				accountKey: STORE,
				contact: {
					name: 'Ana Lima',
					extra: { email: 'ana@x.com', phone: null, storeName: 'Ateliê' },
				},
			});
		});

		const F = StoreSitesEnum.ChatCustomerField;
		const FIELDS = [
			{ field: F.CPF, isRequired: true },
			{ field: F.BIRTH_DATE, isRequired: false },
			{ field: F.GENDER, isRequired: false },
			{ field: F.ADDRESS, isRequired: false },
		];

		it('asks the customer fields the store chose, required or optional', async () => {
			const { service } = build({ chat: chatOn({ extraFields: FIELDS }) });

			await expect(
				service.start('atelie', '1.1.1.1', visitor({ answers: {} })),
			).rejects.toMatchObject({ response: { field: F.CPF } });
		});

		it.each([
			[F.CPF, '123'],
			[F.BIRTH_DATE, '2026-13-40'],
			[F.BIRTH_DATE, '2999-01-01'],
			[F.GENDER, 'ROBOT'],
		])(
			'checks the answer to %s by what the field is: %p is refused',
			async (field, value) => {
				const { service } = build({ chat: chatOn({ extraFields: FIELDS }) });

				await expect(
					service.start(
						'atelie',
						'1.1.1.1',
						visitor({ answers: { [F.CPF]: '123.456.789-09', [field]: value } }),
					),
				).rejects.toMatchObject({ response: { field } });
			},
		);

		it('keeps the answers with the visitor and shows them as the first message', async () => {
			const { service, conversations, messages, guestModel } = build({
				chat: chatOn({ extraFields: FIELDS }),
			});

			await service.start(
				'atelie',
				'1.1.1.1',
				visitor({
					answers: {
						[F.CPF]: ' 123.456.789-09 ',
						[F.GENDER]: 'FEMALE',
						[F.ADDRESS]: 'Rua A, 10',
					},
				}),
			);

			const answers = [
				{ field: F.CPF, label: 'CPF', value: '123.456.789-09' },
				{ field: F.GENDER, label: 'Gênero', value: 'FEMALE' },
				{ field: F.ADDRESS, label: 'Endereço', value: 'Rua A, 10' },
			];

			expect(guestModel.create.mock.calls[0][0].answers).toEqual(answers);
			expect(
				conversations.ensure.mock.calls[0][2].contact.extra.answers,
			).toEqual(answers);

			const [, , first] = messages.saveIncoming.mock.calls[0];

			expect(first.text).toContain('Ana Lima');
			expect(first.text).toContain('CPF: 123.456.789-09');
			expect(first.text).toContain('Gênero: Feminino');
			expect(first.text).toContain('Endereço: Rua A, 10');
		});

		it('answers with a secret token, keeping only its hash', async () => {
			const { service, guestModel } = build();

			const { token } = await service.start('atelie', '1.1.1.1', visitor());

			expect(token).toMatch(/^[A-Za-z0-9_-]{32,}$/);
			const stored = guestModel.create.mock.calls[0][0];
			expect(stored.tokenHash).toBe(hash(token));
			expect(JSON.stringify(stored)).not.toContain(token);
		});

		it('links the conversation to no account and no customer', async () => {
			const { service, conversations } = build();

			await service.start('atelie', '1.1.1.1', visitor());

			const init = conversations.ensure.mock.calls[0][2];

			expect(init.contactUserId ?? null).toBeNull();
			expect(init.customerId ?? null).toBeNull();
		});

		it.each([
			['no name', visitor({ name: '  ' })],
			['no email when it is required', visitor({ email: '' })],
			['an email that is not one', visitor({ email: 'nope' })],
		])('refuses %s', async (_label, data) => {
			const { service, conversations } = build();

			await expect(
				service.start('atelie', '1.1.1.1', data),
			).rejects.toBeInstanceOf(BadRequestException);
			expect(conversations.ensure).not.toHaveBeenCalled();
		});

		it('refuses a phone when it is required and missing, and drops fields the store hides', async () => {
			const required = build({
				chat: chatOn({ phoneField: StoreSitesEnum.ChatFieldMode.REQUIRED }),
			});

			await expect(
				required.service.start('atelie', '1.1.1.1', visitor()),
			).rejects.toBeInstanceOf(BadRequestException);

			const hidden = build({
				chat: chatOn({ emailField: StoreSitesEnum.ChatFieldMode.HIDDEN }),
			});

			await hidden.service.start(
				'atelie',
				'1.1.1.1',
				visitor({ email: 'ana@x.com', phone: '85 9999' }),
			);

			expect(
				hidden.conversations.ensure.mock.calls[0][2].contact.extra.email,
			).toBeNull();
		});

		it('is not there when the site has the chat off', async () => {
			const { service } = build({ chat: chatOn({ isActive: false }) });

			await expect(
				service.start('atelie', '1.1.1.1', visitor()),
			).rejects.toBeInstanceOf(NotFoundException);
		});

		it('stops before anything is made when the limit refuses', async () => {
			const { service, guestModel } = build({ allow: false });

			await expect(
				service.start('atelie', '1.1.1.1', visitor()),
			).rejects.toBeInstanceOf(HttpException);
			expect(guestModel.create).not.toHaveBeenCalled();
		});
	});

	describe('typing', () => {
		const guest = {
			_id: GUEST,
			storeId: STORE,
			ownerUserId: OWNER,
			conversationId: CONVERSATION,
			name: 'Ana Lima',
			tokenHash: hash(TOKEN),
		};

		it('tells the store inbox that the visitor is writing', async () => {
			const { service, realtime } = build({ guest });

			await service.typing('atelie', TOKEN);

			expect(realtime.notifyStoreChatTyping).toHaveBeenCalledWith(OWNER, {
				storeId: STORE,
				conversationId: CONVERSATION,
			});
		});

		it('tells nothing for an unknown visitor', async () => {
			const { service, realtime } = build({ guest: null });

			await expect(service.typing('atelie', 'nope')).rejects.toBeInstanceOf(
				UnauthorizedException,
			);
			expect(realtime.notifyStoreChatTyping).not.toHaveBeenCalled();
		});

		it('says whether the store is writing to this visitor', async () => {
			const { service, typing } = build({ guest });

			await expect(service.storeTyping('atelie', TOKEN)).resolves.toEqual({
				isStoreTyping: true,
			});
			expect(typing.isTyping).toHaveBeenCalledWith(CONVERSATION);
		});
	});

	describe('with a token', () => {
		const guest = {
			_id: GUEST,
			storeId: STORE,
			ownerUserId: OWNER,
			conversationId: CONVERSATION,
			name: 'Ana Lima',
			tokenHash: hash(TOKEN),
		};

		it('uses the time the owner chose for a chat', async () => {
			const { service } = build({
				chat: chatOn({ sessionMinutes: 10 }),
				guest: {
					...guest,
					lastActiveAt: new Date(Date.now() - 11 * 60 * 1000),
				},
			});

			await expect(service.messages('atelie', TOKEN)).rejects.toMatchObject({
				response: { code: 'SITE_CHAT_EXPIRED' },
			});
		});

		it('forgets a visitor who has not written for an hour', async () => {
			const { service } = build({
				guest: {
					...guest,
					lastActiveAt: new Date(Date.now() - 61 * 60 * 1000),
				},
			});

			await expect(service.messages('atelie', TOKEN)).rejects.toMatchObject({
				response: { code: 'SITE_CHAT_EXPIRED' },
			});
			await expect(service.send('atelie', TOKEN, 'Oi')).rejects.toBeInstanceOf(
				UnauthorizedException,
			);
		});

		it('counts an hour from when the chat started, for a visitor who never wrote', async () => {
			const { service } = build({
				guest: {
					...guest,
					lastActiveAt: null,
					createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
				},
			});

			await expect(service.messages('atelie', TOKEN)).rejects.toBeInstanceOf(
				UnauthorizedException,
			);
		});

		it('keeps the chat for another hour each time the visitor writes', async () => {
			const { service, guestModel } = build({
				guest: {
					...guest,
					lastActiveAt: new Date(Date.now() - 50 * 60 * 1000),
				},
			});

			await service.send('atelie', TOKEN, 'Ainda estou aqui');
			await service.typing('atelie', TOKEN);

			const renewals = guestModel.updateOne.mock.calls.filter(
				([, update]: any[]) => update?.$set?.lastActiveAt instanceof Date,
			);

			expect(renewals).toHaveLength(2);
			expect(String(renewals[0][0]._id)).toBe(GUEST);
		});

		it('does not keep the chat alive only by reading it', async () => {
			const { service, guestModel } = build({
				guest: { ...guest, lastActiveAt: new Date() },
			});

			await service.messages('atelie', TOKEN);

			expect(guestModel.updateOne).not.toHaveBeenCalled();
		});

		it('finds the visitor only by the hash of the token, within this site', async () => {
			const { service, guestModel } = build({ guest });

			await service.messages('atelie', TOKEN);

			expect(guestModel.findOne).toHaveBeenCalledWith({
				tokenHash: hash(TOKEN),
				storeId: expect.anything(),
			});
			expect(String(guestModel.findOne.mock.calls[0][0].storeId)).toBe(STORE);
		});

		it('refuses an unknown token', async () => {
			const { service } = build({ guest: null });

			await expect(service.messages('atelie', 'nope')).rejects.toBeInstanceOf(
				UnauthorizedException,
			);
			await expect(service.send('atelie', 'nope', 'Oi')).rejects.toBeInstanceOf(
				UnauthorizedException,
			);
		});

		it('lists the conversation oldest first, saying who wrote and nothing internal', async () => {
			const { service } = build({ guest });

			const list = await service.messages('atelie', TOKEN);

			expect(list).toEqual([
				{
					id: 'm1',
					fromStore: false,
					kind: InboxEnum.MessageKind.TEXT,
					text: 'Tem em azul?',
					attachments: [],
					sentAt: new Date('2026-01-01T10:00:00Z'),
					editedAt: null,
				},
				{
					id: 'm2',
					fromStore: true,
					kind: InboxEnum.MessageKind.TEXT,
					text: 'Oi!',
					attachments: [],
					sentAt: new Date('2026-01-01T10:01:00Z'),
					editedAt: null,
				},
			]);
		});

		it('records what the visitor writes as a message to the store, and tells its inbox', async () => {
			const { service, messages, conversations, realtime } = build({ guest });

			const sent = await service.send('atelie', TOKEN, '  Tem em azul?  ');

			const [ownerUserId, conversation, input] =
				messages.saveIncoming.mock.calls[0];

			expect(ownerUserId).toBe(OWNER);
			expect(String(conversation._id)).toBe(CONVERSATION);
			expect(input).toMatchObject({
				kind: InboxEnum.MessageKind.TEXT,
				text: 'Tem em azul?',
				sender: { id: GUEST, name: 'Ana Lima', username: null },
			});
			expect(conversations.applyIncoming).toHaveBeenCalled();
			expect(realtime.notifyInboxUpdated).toHaveBeenCalledWith(
				OWNER,
				expect.anything(),
				CONVERSATION,
			);
			expect(sent).toMatchObject({ fromStore: false, text: 'Tem em azul?' });
		});

		it.each([
			['nothing', '   '],
			['too much', 'x'.repeat(2001)],
		])('refuses a message with %s', async (_label, text) => {
			const { service, messages } = build({ guest });

			await expect(service.send('atelie', TOKEN, text)).rejects.toBeInstanceOf(
				BadRequestException,
			);
			expect(messages.saveIncoming).not.toHaveBeenCalled();
		});

		it('shows the files of a message without where they are stored', async () => {
			const { service, messages } = build({ guest });

			messages.listByConversation.mockResolvedValue([
				{
					_id: 'm3',
					direction: InboxEnum.Direction.OUT,
					kind: InboxEnum.MessageKind.VOICE,
					text: null,
					attachments: [STORED],
					sentAt: new Date('2026-01-01T10:02:00Z'),
				},
			]);

			const [message] = await service.messages('atelie', TOKEN);

			expect(message.attachments).toEqual([
				{
					kind: InboxEnum.MessageKind.VOICE,
					mimeType: 'audio/webm',
					fileName: 'voz.webm',
					size: 1200,
				},
			]);
			expect(JSON.stringify(message)).not.toContain('chat/k1');
		});

		it('records a file or a recording of the visitor, with its words, and tells the inbox', async () => {
			const { service, messages, conversations, realtime, media } = build({
				guest,
			});

			const sent = await service.sendMedia('atelie', TOKEN, FILE, {
				caption: '  ouve isso  ',
				asVoice: true,
			});

			expect(media.store).toHaveBeenCalledWith(FILE, true);

			const [ownerUserId, conversation, input] =
				messages.saveIncoming.mock.calls[0];

			expect(ownerUserId).toBe(OWNER);
			expect(String(conversation._id)).toBe(CONVERSATION);
			expect(input).toMatchObject({
				kind: InboxEnum.MessageKind.VOICE,
				text: 'ouve isso',
				attachments: [STORED],
				sender: { id: GUEST, name: 'Ana Lima', username: null },
			});
			expect(
				conversations.applyIncoming.mock.calls[0][2].preview,
			).toMatchObject({ kind: InboxEnum.MessageKind.VOICE, text: 'ouve isso' });
			expect(realtime.notifyInboxUpdated).toHaveBeenCalled();
			expect(sent).toMatchObject({
				fromStore: false,
				kind: InboxEnum.MessageKind.VOICE,
				attachments: [{ fileName: 'voz.webm', size: 1200 }],
			});
		});

		it('stores no file of an unknown visitor, nor of one sending too fast', async () => {
			const unknown = build({ guest: null });

			await expect(
				unknown.service.sendMedia('atelie', 'nope', FILE, {
					caption: null,
					asVoice: false,
				}),
			).rejects.toBeInstanceOf(UnauthorizedException);
			expect(unknown.media.store).not.toHaveBeenCalled();

			const fast = build({ guest, allow: false });

			await expect(
				fast.service.sendMedia('atelie', TOKEN, FILE, {
					caption: null,
					asVoice: false,
				}),
			).rejects.toBeInstanceOf(HttpException);
			expect(fast.media.store).not.toHaveBeenCalled();
		});

		it('gives a file only from a message of the visitor own conversation', async () => {
			const { service, messages, media } = build({ guest });

			const MESSAGE = new Types.ObjectId().toString();

			const file = await service.attachment('atelie', TOKEN, MESSAGE, 0);

			expect(messages.findOwned).toHaveBeenCalledWith(
				OWNER,
				CONVERSATION,
				MESSAGE,
			);
			expect(media.read).toHaveBeenCalledWith(
				expect.objectContaining({ _id: 'm3' }),
				0,
			);
			expect(file.contentType).toBe('audio/webm');

			messages.findOwned.mockResolvedValue(null);

			await expect(
				service.attachment('atelie', TOKEN, new Types.ObjectId().toString(), 0),
			).rejects.toBeInstanceOf(NotFoundException);
		});

		it('stops a visitor who writes too fast', async () => {
			const { service, messages } = build({ guest, allow: false });

			await expect(service.send('atelie', TOKEN, 'Oi')).rejects.toBeInstanceOf(
				HttpException,
			);
			expect(messages.saveIncoming).not.toHaveBeenCalled();
		});
	});

	describe('contact', () => {
		const CONTACT_PAGE = { key: 'contact', type: 'CONTACT', slug: 'contato' };

		const FORM = {
			name: '  Ana  ',
			email: ' ANA@Mail.com ',
			phone: '',
			message: '  Vocês entregam em Recife?  ',
		};

		const withPage = (patch: any = {}, pages: any[] = [CONTACT_PAGE]) =>
			build({
				resolve: jest.fn().mockResolvedValue({
					site: { slug: 'atelie', storeId: STORE, chat: chatOn(), pages },
					owner: { _id: OWNER },
					store: { _id: STORE, name: 'Ateliê' },
					...patch,
				}),
			});

		it('opens a conversation in the store inbox with who wrote and what they wrote', async () => {
			const { service, conversations, messages, realtime, guestModel } =
				withPage();

			const result = await service.contact('atelie', '1.1.1.1', FORM);

			expect(guestModel.create.mock.calls[0][0]).toMatchObject({
				name: 'Ana',
				email: 'ana@mail.com',
				phone: null,
			});
			expect(conversations.ensure).toHaveBeenCalledWith(
				OWNER,
				{ channel: InboxEnum.Channel.SITE, contactKey: GUEST },
				expect.objectContaining({
					contact: expect.objectContaining({ name: 'Ana' }),
				}),
			);
			expect(messages.saveIncoming.mock.calls[0][2]).toMatchObject({
				kind: InboxEnum.MessageKind.TEXT,
				text: 'Vocês entregam em Recife?',
			});
			expect(realtime.notifyInboxUpdated).toHaveBeenCalled();
			// The chat of the site is on: its window can follow the answer.
			expect(result.token).toHaveLength(43);
		});

		it('gives no secret when the site has no chat window to follow the answer', async () => {
			const { service, messages } = withPage({
				site: {
					slug: 'atelie',
					storeId: STORE,
					chat: chatOn({ isActive: false }),
					pages: [CONTACT_PAGE],
				},
			});

			await expect(service.contact('atelie', '1.1.1.1', FORM)).resolves.toEqual(
				{ token: null },
			);
			expect(messages.saveIncoming).toHaveBeenCalledTimes(1);
		});

		it('is 404 on a site without the contact page', async () => {
			const { service, guestModel } = withPage({}, []);

			await expect(
				service.contact('atelie', '1.1.1.1', FORM),
			).rejects.toBeInstanceOf(NotFoundException);
			expect(guestModel.create).not.toHaveBeenCalled();
		});

		it.each([
			[{ name: ' ' }],
			[{ email: '' }],
			[{ email: 'ana@' }],
			[{ phone: '12' }],
			[{ message: '  ' }],
			[{ message: 'a'.repeat(2001) }],
		])('refuses %p before anything is stored', async (patch) => {
			const { service, guestModel, messages } = withPage();

			await expect(
				service.contact('atelie', '1.1.1.1', { ...FORM, ...patch }),
			).rejects.toBeInstanceOf(BadRequestException);
			expect(guestModel.create).not.toHaveBeenCalled();
			expect(messages.saveIncoming).not.toHaveBeenCalled();
		});

		const pageWith = (contact: any) => ({ ...CONTACT_PAGE, contact });

		it("takes the answers of the owner's own fields, by their keys", async () => {
			const { service, guestModel, messages } = withPage({}, [
				pageWith({
					fields: [
						{ key: 'quem', type: 'NAME', isRequired: true },
						{ key: 'tipo', type: 'SELECT', label: 'Tipo', options: ['Bolo'] },
						{ key: 'obs', type: 'TEXTAREA', label: 'Obs' },
					],
				}),
			]);

			await service.contact('atelie', '1.1.1.1', {
				answers: { quem: 'Ana', tipo: 'Bolo', obs: 'Sábado' },
			});

			// No e-mail asked: the conversation is still someone's.
			expect(guestModel.create.mock.calls[0][0]).toMatchObject({
				name: 'Ana',
				email: null,
			});
			expect(messages.saveIncoming.mock.calls[0][2].text).toBe(
				'Tipo: Bolo\nObs: Sábado',
			);

			await expect(
				service.contact('atelie', '1.1.1.1', {
					answers: { quem: 'Ana', tipo: 'Pizza' },
				}),
			).rejects.toBeInstanceOf(BadRequestException);
		});

		it("sends to the owner's e-mail, with no conversation, when that is where it goes", async () => {
			const { service, delivery, guestModel } = withPage({}, [
				pageWith({ destination: 'EMAIL', email: 'dono@loja.com' }),
			]);

			await expect(service.contact('atelie', '1.1.1.1', FORM)).resolves.toEqual(
				{ token: null },
			);

			expect(delivery.email).toHaveBeenCalledWith(
				'dono@loja.com',
				'Ateliê',
				expect.arrayContaining([
					expect.objectContaining({ value: 'Vocês entregam em Recife?' }),
				]),
				'ana@mail.com',
			);
			expect(guestModel.create).not.toHaveBeenCalled();
		});

		it("posts to the owner's address when that is where it goes", async () => {
			const { service, delivery, guestModel } = withPage({}, [
				pageWith({
					destination: 'WEBHOOK',
					webhookUrl: 'https://hooks.example.com/a',
				}),
			]);

			await expect(service.contact('atelie', '1.1.1.1', FORM)).resolves.toEqual(
				{ token: null },
			);

			expect(delivery.webhook).toHaveBeenCalledWith(
				'https://hooks.example.com/a',
				expect.objectContaining({
					site: 'atelie',
					store: 'Ateliê',
					fields: expect.any(Array),
				}),
			);
			expect(guestModel.create).not.toHaveBeenCalled();
		});

		it('tells the visitor to try again when it could not leave', async () => {
			const { service, delivery } = withPage({}, [
				pageWith({ destination: 'EMAIL', email: 'dono@loja.com' }),
			]);
			delivery.email.mockResolvedValue(false);

			await expect(
				service.contact('atelie', '1.1.1.1', FORM),
			).rejects.toBeInstanceOf(ServiceUnavailableException);
		});

		it('falls back to the inbox while the destination has no address yet', async () => {
			const { service, delivery, guestModel } = withPage({}, [
				pageWith({ destination: 'EMAIL' }),
			]);

			await service.contact('atelie', '1.1.1.1', FORM);

			expect(delivery.email).not.toHaveBeenCalled();
			expect(guestModel.create).toHaveBeenCalledTimes(1);
		});

		it('takes nothing for a form that opens WhatsApp', async () => {
			const { service, guestModel, delivery } = withPage({}, [
				pageWith({ destination: 'WHATSAPP', whatsapp: '5585999990000' }),
			]);

			await expect(
				service.contact('atelie', '1.1.1.1', FORM),
			).rejects.toBeInstanceOf(BadRequestException);
			expect(guestModel.create).not.toHaveBeenCalled();
			expect(delivery.email).not.toHaveBeenCalled();
		});

		it('is limited like starting a chat', async () => {
			const { service, limiter, guestModel } = withPage();
			limiter.assertAllowed.mockImplementation(() => {
				throw new HttpException('too many', 429);
			});

			await expect(
				service.contact('atelie', '1.1.1.1', FORM),
			).rejects.toBeInstanceOf(HttpException);
			expect(guestModel.create).not.toHaveBeenCalled();
		});
	});

	describe('editMessage', () => {
		const known = () =>
			build({
				guest: {
					_id: GUEST,
					ownerUserId: OWNER,
					storeId: STORE,
					conversationId: CONVERSATION,
					tokenHash: hash(TOKEN),
					lastActiveAt: new Date(),
				},
			});

		it("changes the visitor's own message, as written by the visitor", async () => {
			const { service, edition } = known();

			const view = await service.editMessage(
				'atelie',
				TOKEN,
				'm1',
				'  Tem em verde?  ',
			);

			expect(edition.edit).toHaveBeenCalledWith(
				expect.objectContaining({ _id: CONVERSATION }),
				'm1',
				InboxEnum.Direction.IN,
				'Tem em verde?',
			);
			expect(view).toMatchObject({ id: 'm1', text: 'Tem em verde?' });
			expect(view.editedAt).toEqual(new Date('2026-01-01T10:05:00Z'));
		});

		it('refuses empty words', async () => {
			const { service, edition } = known();

			await expect(
				service.editMessage('atelie', TOKEN, 'm1', '   '),
			).rejects.toBeInstanceOf(BadRequestException);
			expect(edition.edit).not.toHaveBeenCalled();
		});

		it('refuses a visitor the site does not know', async () => {
			const { service, edition } = build();

			await expect(
				service.editMessage('atelie', TOKEN, 'm1', 'oi'),
			).rejects.toBeInstanceOf(UnauthorizedException);
			expect(edition.edit).not.toHaveBeenCalled();
		});
	});

	describe('deleteMessage', () => {
		it("removes the visitor's own message, as the visitor", async () => {
			const { service, deletion } = build({
				guest: {
					_id: GUEST,
					ownerUserId: OWNER,
					storeId: STORE,
					conversationId: CONVERSATION,
					tokenHash: hash(TOKEN),
					lastActiveAt: new Date(),
				},
			});

			await service.deleteMessage('atelie', TOKEN, 'm1');

			expect(deletion.remove).toHaveBeenCalledWith(
				expect.objectContaining({ _id: CONVERSATION }),
				'm1',
				InboxEnum.Direction.IN,
			);
		});
	});
});
