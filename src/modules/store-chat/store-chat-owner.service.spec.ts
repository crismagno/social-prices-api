import {
	BadRequestException,
	ConflictException,
	NotFoundException,
} from '@nestjs/common';

import { StoreChatOwnerService } from './store-chat-owner.service';

const OWNER = '507f1f77bcf86cd799439099';
const ACCOUNT = '507f1f77bcf86cd799439011';
const STORE = '507f1f77bcf86cd799439021';
const CONV = '507f1f77bcf86cd799439031';
const CUSTOMER = '507f1f77bcf86cd799439041';
const CTX = { ownerUserId: OWNER, employeeId: 'e1' };

const conversation = (over: any = {}): any => ({
	_id: CONV,
	ownerUserId: OWNER,
	channel: 'STORE',
	contactKey: `${ACCOUNT}:${STORE}`,
	accountKey: STORE,
	contactUserId: ACCOUNT,
	...over,
});

const lean = (value: any) => ({ lean: jest.fn().mockResolvedValue(value) });

const build = (existing: any = null) => {
	const conversations: any = {
		findByKey: jest.fn().mockResolvedValue(existing),
		ensure: jest
			.fn()
			.mockResolvedValue({ conversation: conversation(), created: true }),
		applyOutgoing: jest.fn().mockResolvedValue(undefined),
		incContactUnread: jest.fn().mockResolvedValue(undefined),
		countUnread: jest.fn().mockResolvedValue(7),
	};
	const messages: any = {
		saveOutgoing: jest
			.fn()
			.mockImplementation(async (_o: string, _c: any, input: any) => ({
				_id: 'm1',
				direction: 'OUT',
				...input,
			})),
	};
	const storeModel: any = {
		findOne: jest
			.fn()
			.mockReturnValue(
				lean({ _id: STORE, name: 'Loja Central', userId: OWNER }),
			),
	};
	const customerModel: any = {
		findOne: jest.fn().mockReturnValue(
			lean({
				_id: CUSTOMER,
				name: 'Ana Souza',
				userId: ACCOUNT,
				email: 'ana@example.com',
			}),
		),
	};
	const userModel: any = {
		findOne: jest
			.fn()
			.mockReturnValue(lean({ _id: ACCOUNT, name: 'Ana Conta' })),
	};
	const realtime: any = { notifyStoreChatUpdated: jest.fn() };
	const media: any = {
		caption: jest
			.fn()
			.mockImplementation((text: any) => (text ? String(text).trim() : null)),
		assertSendable: jest.fn(),
		store: jest.fn().mockResolvedValue({
			kind: 'IMAGE',
			mimeType: 'image/png',
			fileName: 'foto.png',
			size: 3,
			width: null,
			height: null,
			duration: null,
			source: { type: 'STORED_FILE', key: 'stored.png' },
		}),
		read: jest.fn().mockResolvedValue({
			buffer: Buffer.from('abc'),
			contentType: 'image/png',
			fileName: 'foto.png',
		}),
		removeFilesOf: jest.fn().mockResolvedValue(undefined),
	};
	const deletion: any = { remove: jest.fn().mockResolvedValue(undefined) };
	const edition: any = {
		edit: jest
			.fn()
			.mockImplementation(
				async (_conversation: any, id: string, by: string, text: string) => ({
					_id: id,
					direction: by,
					kind: 'TEXT',
					text,
					attachments: [],
					sentAt: new Date('2030-01-05'),
					editedAt: new Date('2030-01-06'),
				}),
			),
	};

	return {
		media,
		deletion,
		edition,
		conversations,
		messages,
		storeModel,
		customerModel,
		userModel,
		realtime,
		service: new StoreChatOwnerService(
			storeModel,
			customerModel,
			userModel,
			conversations,
			messages,
			realtime,
			deletion,
			media,
			edition,
		),
	};
};

describe('StoreChatOwnerService', () => {
	describe('sendText', () => {
		it('stores the answer, counts it for the account and tells it', async () => {
			const { service, conversations, messages, realtime } = build();

			const saved = await service.sendText(CTX, conversation(), 'temos sim');

			const [owner, ref, input] = messages.saveOutgoing.mock.calls[0];

			expect(owner).toBe(OWNER);
			expect(ref._id).toBe(CONV);
			expect(input).toMatchObject({
				kind: 'TEXT',
				text: 'temos sim',
				attachments: [],
				sentByEmployeeId: 'e1',
			});
			expect(conversations.applyOutgoing).toHaveBeenCalledWith(
				OWNER,
				CONV,
				expect.objectContaining({ text: 'temos sim', direction: 'OUT' }),
			);
			expect(conversations.incContactUnread).toHaveBeenCalledWith(OWNER, CONV);
			expect(realtime.notifyStoreChatUpdated).toHaveBeenCalledWith(ACCOUNT, {
				storeId: STORE,
				conversationId: CONV,
			});
			expect(saved).toMatchObject({ _id: 'm1', text: 'temos sim' });
		});
	});

	describe('typing', () => {
		it('tells the account that the store is writing', () => {
			const { service, realtime } = build();

			realtime.notifyStoreChatTyping = jest.fn();

			service.typing(conversation());

			expect(realtime.notifyStoreChatTyping).toHaveBeenCalledWith(ACCOUNT, {
				storeId: STORE,
				conversationId: CONV,
			});
		});

		it('tells nobody when the conversation has no account behind it', () => {
			const { service, realtime } = build();

			realtime.notifyStoreChatTyping = jest.fn();

			service.typing(conversation({ contactUserId: null }));

			expect(realtime.notifyStoreChatTyping).not.toHaveBeenCalled();
		});
	});

	describe('sendMedia', () => {
		const file: any = {
			buffer: Buffer.from('abc'),
			fileName: 'foto.png',
			mimeType: 'image/png',
		};

		it('stores the file, then the message with it and its caption, and tells the account', async () => {
			const { service, media, messages, conversations, realtime } = build();

			await service.sendMedia(CTX, conversation(), file, {
				caption: '  veja  ',
				asVoice: false,
			});

			expect(media.store).toHaveBeenCalledWith(file, false);

			const input = messages.saveOutgoing.mock.calls[0][2];

			expect(input).toMatchObject({
				kind: 'IMAGE',
				text: 'veja',
				sentByEmployeeId: 'e1',
			});
			expect(input.attachments).toHaveLength(1);
			expect(input.attachments[0].source).toEqual({
				type: 'STORED_FILE',
				key: 'stored.png',
			});
			expect(conversations.applyOutgoing).toHaveBeenCalledWith(
				OWNER,
				CONV,
				expect.objectContaining({ kind: 'IMAGE', text: 'veja' }),
			);
			expect(conversations.incContactUnread).toHaveBeenCalledWith(OWNER, CONV);
			expect(realtime.notifyStoreChatUpdated).toHaveBeenCalled();
		});

		it('sends a recording as a voice message, with no text', async () => {
			const { service, media, messages } = build();

			media.store.mockResolvedValue({ kind: 'VOICE', source: {} });

			await service.sendMedia(CTX, conversation(), file, {
				caption: null,
				asVoice: true,
			});

			expect(media.store).toHaveBeenCalledWith(file, true);
			expect(messages.saveOutgoing.mock.calls[0][2]).toMatchObject({
				kind: 'VOICE',
				text: null,
			});
		});

		it('stores no message when the file is refused', async () => {
			const { service, media, messages } = build();

			media.store.mockRejectedValue(new BadRequestException('too large'));

			await expect(
				service.sendMedia(CTX, conversation(), file, {
					caption: null,
					asVoice: false,
				}),
			).rejects.toBeInstanceOf(BadRequestException);
			expect(messages.saveOutgoing).not.toHaveBeenCalled();
		});
	});

	it('getAttachment reads the file of that message', async () => {
		const { service, media } = build();
		const message: any = { _id: 'm1' };

		await expect(service.getAttachment(message, 0)).resolves.toMatchObject({
			contentType: 'image/png',
		});
		expect(media.read).toHaveBeenCalledWith(message, 0);
	});

	describe('start', () => {
		it('refuses a text that is too long', async () => {
			const { service, conversations, messages } = build();

			await expect(
				service.start(CTX, CUSTOMER, STORE, 'a'.repeat(1001)),
			).rejects.toBeInstanceOf(BadRequestException);
			expect(conversations.ensure).not.toHaveBeenCalled();
			expect(messages.saveOutgoing).not.toHaveBeenCalled();
		});

		it.each([[undefined], [''], ['   ']])(
			'with the text %p only opens the conversation: a file or a recording comes next',
			async (text) => {
				const { service, conversations, messages } = build();

				const result = await service.start(CTX, CUSTOMER, STORE, text);

				expect(conversations.ensure).toHaveBeenCalledTimes(1);
				expect(messages.saveOutgoing).not.toHaveBeenCalled();
				expect(result).toEqual({ conversationId: CONV, customerId: CUSTOMER });
			},
		);

		it('refuses a store that is not the user own', async () => {
			const { service, storeModel } = build();

			storeModel.findOne.mockReturnValue(lean(null));

			await expect(
				service.start(CTX, CUSTOMER, STORE, 'oi'),
			).rejects.toBeInstanceOf(NotFoundException);
			expect(storeModel.findOne.mock.calls[0][0]).toMatchObject({
				_id: STORE,
				userId: OWNER,
			});
		});

		it('refuses a customer that is not the user own', async () => {
			const { service, customerModel } = build();

			customerModel.findOne.mockReturnValue(lean(null));

			await expect(
				service.start(CTX, CUSTOMER, STORE, 'oi'),
			).rejects.toBeInstanceOf(NotFoundException);
			expect(customerModel.findOne.mock.calls[0][0]).toEqual({
				_id: CUSTOMER,
				ownerUserId: OWNER,
			});
		});

		it.each([
			['not-an-id', STORE],
			[CUSTOMER, 'not-an-id'],
		])('refuses ids that are not ids (%p, %p)', async (customerId, storeId) => {
			const { service } = build();

			await expect(
				service.start(CTX, customerId, storeId, 'oi'),
			).rejects.toBeInstanceOf(NotFoundException);
		});

		it('finds the account by the customer link first', async () => {
			const { service, userModel } = build();

			await service.start(CTX, CUSTOMER, STORE, 'oi');

			expect(userModel.findOne).toHaveBeenCalledTimes(1);
			expect(userModel.findOne.mock.calls[0][0]).toMatchObject({
				_id: ACCOUNT,
			});
		});

		it('else finds it by the customer e-mail, whatever the case', async () => {
			const { service, userModel, customerModel, conversations } = build();

			customerModel.findOne.mockReturnValue(
				lean({ _id: CUSTOMER, userId: null, email: 'Ana@Example.com' }),
			);

			await service.start(CTX, CUSTOMER, STORE, 'oi');

			const filter = userModel.findOne.mock.calls[0][0];

			expect(filter.email.test('ana@example.COM')).toBe(true);
			expect(filter.email.test('xana@example.com')).toBe(false);
			expect(conversations.ensure.mock.calls[0][2].contactUserId).toBe(ACCOUNT);
		});

		it.each([
			[{ _id: CUSTOMER, userId: null, email: null }],
			[{ _id: CUSTOMER, userId: null, email: 'ghost@example.com' }],
			[{ _id: CUSTOMER, userId: ACCOUNT, email: null }],
		])('says so when the customer has no account (%p)', async (customer) => {
			const { service, customerModel, userModel, messages } = build();

			customerModel.findOne.mockReturnValue(lean(customer));
			userModel.findOne.mockReturnValue(lean(null));

			const error = await service
				.start(CTX, CUSTOMER, STORE, 'oi')
				.catch((thrown) => thrown);

			expect(error).toBeInstanceOf(ConflictException);
			expect(error.getResponse()).toMatchObject({
				code: 'CUSTOMER_HAS_NO_ACCOUNT',
			});
			expect(messages.saveOutgoing).not.toHaveBeenCalled();
		});

		it('refuses when the customer account is the user own', async () => {
			const { service, userModel } = build();

			userModel.findOne.mockReturnValue(lean({ _id: OWNER }));

			await expect(
				service.start(CTX, CUSTOMER, STORE, 'oi'),
			).rejects.toMatchObject({ response: { code: 'STORE_CHAT_OWN_STORE' } });
		});

		it('opens the conversation tied to that customer and sends the first message', async () => {
			const { service, conversations, messages } = build();

			const result = await service.start(CTX, CUSTOMER, STORE, '  olá  ');

			expect(conversations.ensure).toHaveBeenCalledWith(
				OWNER,
				{ channel: 'STORE', contactKey: `${ACCOUNT}:${STORE}` },
				{
					accountKey: STORE,
					contactUserId: ACCOUNT,
					customerId: CUSTOMER,
					contact: {
						name: 'Ana Conta',
						extra: {
							customerUserId: ACCOUNT,
							storeId: STORE,
							storeName: 'Loja Central',
						},
					},
				},
			);
			expect(messages.saveOutgoing.mock.calls[0][2].text).toBe('olá');
			expect(result).toEqual({ conversationId: CONV, customerId: CUSTOMER });
		});

		it('only sends when the conversation is already there', async () => {
			const { service, conversations, messages } = build(conversation());

			await service.start(CTX, CUSTOMER, STORE, 'oi');

			expect(conversations.ensure).not.toHaveBeenCalled();
			expect(messages.saveOutgoing).toHaveBeenCalledTimes(1);
		});
	});

	it('editMessage changes, as the store side, the words of a message of that conversation', async () => {
		const { service, edition } = build();
		const own = conversation();

		await expect(
			service.editMessage(own, { _id: 'm1' } as any, '  claro!  '),
		).resolves.toMatchObject({ _id: 'm1', text: 'claro!' });

		expect(edition.edit).toHaveBeenCalledWith(own, 'm1', 'OUT', 'claro!');
	});

	it('editMessage refuses an empty text', async () => {
		const { service, edition } = build();

		await expect(
			service.editMessage(conversation(), { _id: 'm1' } as any, '  '),
		).rejects.toBeInstanceOf(BadRequestException);
		expect(edition.edit).not.toHaveBeenCalled();
	});

	it('deleteMessage removes, as the store side, a message of that conversation', async () => {
		const { service, deletion } = build();
		const own = conversation();

		await service.deleteMessage(own, { _id: 'm1' } as any);

		expect(deletion.remove).toHaveBeenCalledWith(own, 'm1', 'OUT');
	});

	it('countUnread is what the user has not read on this channel', async () => {
		const { service, conversations } = build();

		await expect(service.countUnread(OWNER)).resolves.toBe(7);
		expect(conversations.countUnread).toHaveBeenCalledWith(OWNER, 'STORE');
	});
});
