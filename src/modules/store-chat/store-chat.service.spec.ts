import {
	BadRequestException,
	HttpException,
	NotFoundException,
} from '@nestjs/common';

import { StoreChatService } from './store-chat.service';

const BUYER = { userId: '507f1f77bcf86cd799439011', email: 'ana@example.com' };
const OWNER = '507f1f77bcf86cd799439099';
const STORE = '507f1f77bcf86cd799439021';
const CONV = '507f1f77bcf86cd799439031';
const CUSTOMER = '507f1f77bcf86cd799439041';
const KEY = `${BUYER.userId}:${STORE}`;

const conversation = (over: any = {}): any => ({
	_id: CONV,
	ownerUserId: OWNER,
	channel: 'STORE',
	contactKey: KEY,
	accountKey: STORE,
	contactUserId: BUYER.userId,
	contactUnreadCount: 2,
	lastMessageAt: new Date('2030-01-02'),
	lastMessageText: 'oi',
	lastMessageDirection: 'IN',
	...over,
});

const build = (existing: any = null) => {
	const conversations: any = {
		findByContact: jest.fn().mockResolvedValue(existing),
		ensure: jest
			.fn()
			.mockResolvedValue({ conversation: conversation(), created: true }),
		applyIncoming: jest.fn().mockResolvedValue(true),
		countCreatedByContactSince: jest.fn().mockResolvedValue(0),
		listByContactUser: jest.fn().mockResolvedValue(existing ? [existing] : []),
		markContactRead: jest.fn().mockResolvedValue(undefined),
		countContactUnread: jest.fn().mockResolvedValue(4),
	};
	const messages: any = {
		saveIncoming: jest.fn().mockResolvedValue(true),
		findByChannelMessageId: jest
			.fn()
			.mockImplementation(
				async (_owner: string, _conv: string, channelMessageId: string) => ({
					_id: 'm1',
					direction: 'IN',
					kind: 'TEXT',
					text: 'oi',
					attachments: [],
					sentAt: new Date('2030-01-03'),
					channelMessageId,
				}),
			),
		findOwned: jest.fn().mockResolvedValue({ _id: 'm1', attachments: [{}] }),
		listByConversation: jest.fn().mockResolvedValue([]),
	};
	const stores: any = {
		findUsable: jest
			.fn()
			.mockResolvedValue({ _id: STORE, name: 'Loja Central', userId: OWNER }),
		cardsByIds: jest.fn().mockResolvedValue(
			new Map([
				[
					STORE,
					{
						_id: STORE,
						name: 'Loja Central',
						logo: null,
						description: null,
						type: null,
					},
				],
			]),
		),
	};
	const usersService: any = {
		findOneById: jest.fn().mockResolvedValue({ name: 'Ana Souza' }),
	};
	const customerModel: any = {
		findOne: jest.fn().mockReturnValue({
			lean: jest.fn().mockResolvedValue(null),
		}),
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
		stores,
		usersService,
		customerModel,
		realtime,
		service: new StoreChatService(
			customerModel,
			conversations,
			messages,
			stores,
			usersService,
			realtime,
			deletion,
			media,
			edition,
		),
	};
};

describe('StoreChatService', () => {
	describe('send', () => {
		it.each([[''], ['   '], ['a'.repeat(1001)]])(
			'refuses the text %p',
			async (text) => {
				const { service, messages } = build();

				await expect(service.send(BUYER, STORE, text)).rejects.toBeInstanceOf(
					BadRequestException,
				);
				expect(messages.saveIncoming).not.toHaveBeenCalled();
			},
		);

		it('takes 1000 characters, and trims', async () => {
			const { service, messages } = build();

			await service.send(BUYER, STORE, `  ${'a'.repeat(1000)}  `);

			expect(messages.saveIncoming.mock.calls[0][2].text).toBe(
				'a'.repeat(1000),
			);
		});

		it('refuses writing to a store of the same account', async () => {
			const { service, stores, messages } = build();

			stores.findUsable.mockResolvedValue({ _id: STORE, userId: BUYER.userId });

			await expect(service.send(BUYER, STORE, 'oi')).rejects.toMatchObject({
				response: { code: 'STORE_CHAT_OWN_STORE' },
			});
			expect(messages.saveIncoming).not.toHaveBeenCalled();
		});

		it('opens the conversation on the first message, stores it and tells the store', async () => {
			const { service, conversations, messages, realtime } = build();

			const view = await service.send(BUYER, STORE, 'oi');

			expect(conversations.ensure).toHaveBeenCalledWith(
				OWNER,
				{ channel: 'STORE', contactKey: KEY },
				{
					accountKey: STORE,
					contactUserId: BUYER.userId,
					customerId: null,
					contact: {
						name: 'Ana Souza',
						extra: {
							customerUserId: BUYER.userId,
							storeId: STORE,
							storeName: 'Loja Central',
						},
					},
				},
			);

			const [owner, ref, input] = messages.saveIncoming.mock.calls[0];

			expect(owner).toBe(OWNER);
			expect(ref._id).toBe(CONV);
			expect(input).toMatchObject({
				kind: 'TEXT',
				text: 'oi',
				attachments: [],
				sender: { id: BUYER.userId, name: 'Ana Souza' },
			});
			expect(conversations.applyIncoming).toHaveBeenCalledWith(
				OWNER,
				CONV,
				expect.objectContaining({
					preview: expect.objectContaining({ text: 'oi', direction: 'IN' }),
				}),
			);
			expect(realtime.notifyStoreChatUpdated).toHaveBeenCalledWith(OWNER, {
				storeId: STORE,
				conversationId: CONV,
			});
			expect(view).toEqual({
				_id: 'm1',
				fromMe: true,
				kind: 'TEXT',
				text: 'oi',
				attachments: [],
				sentAt: new Date('2030-01-03'),
				editedAt: null,
			});
		});

		it.each([[null], ['  ']])(
			'names an account whose name is %p by its e-mail',
			async (name) => {
				const { service, conversations, usersService } = build();

				usersService.findOneById.mockResolvedValue({ name });

				await service.send(BUYER, STORE, 'oi');

				expect(conversations.ensure.mock.calls[0][2].contact.name).toBe(
					BUYER.email,
				);
			},
		);

		it('ties the conversation to the owner customer of that account', async () => {
			const { service, conversations, customerModel } = build();

			customerModel.findOne.mockReturnValueOnce({
				lean: jest.fn().mockResolvedValue({ _id: CUSTOMER }),
			});

			await service.send(BUYER, STORE, 'oi');

			expect(customerModel.findOne.mock.calls[0][0]).toEqual({
				ownerUserId: OWNER,
				userId: BUYER.userId,
			});
			expect(conversations.ensure.mock.calls[0][2].customerId).toBe(CUSTOMER);
		});

		it('else ties it to the owner customer with the same e-mail, whatever the case', async () => {
			const { service, conversations, customerModel } = build();

			customerModel.findOne
				.mockReturnValueOnce({ lean: jest.fn().mockResolvedValue(null) })
				.mockReturnValueOnce({
					lean: jest.fn().mockResolvedValue({ _id: CUSTOMER }),
				});

			await service.send(BUYER, STORE, 'oi');

			const byEmail = customerModel.findOne.mock.calls[1][0];

			expect(byEmail.ownerUserId).toBe(OWNER);
			expect(byEmail.email.test('ANA@example.com')).toBe(true);
			expect(conversations.ensure.mock.calls[0][2].customerId).toBe(CUSTOMER);
		});

		it('stops a tenth-plus new conversation of the day, storing nothing', async () => {
			const { service, conversations, messages } = build();

			conversations.countCreatedByContactSince.mockResolvedValue(10);

			const error: HttpException = await service
				.send(BUYER, STORE, 'oi')
				.catch((thrown) => thrown);

			expect(error.getStatus()).toBe(429);
			expect(error.getResponse()).toMatchObject({
				code: 'STORE_CHAT_DAILY_LIMIT',
			});
			expect(conversations.ensure).not.toHaveBeenCalled();
			expect(messages.saveIncoming).not.toHaveBeenCalled();
		});

		it('counts the day from 24 hours back', async () => {
			const { service, conversations } = build();
			const before: number = Date.now();

			await service.send(BUYER, STORE, 'oi');

			const since: Date =
				conversations.countCreatedByContactSince.mock.calls[0][1];

			expect(before - since.getTime()).toBeGreaterThanOrEqual(
				24 * 60 * 60 * 1000 - 5,
			);
			expect(before - since.getTime()).toBeLessThan(24 * 60 * 60 * 1000 + 5000);
		});

		it('never limits writing in a conversation that already exists', async () => {
			const { service, conversations, messages } = build(conversation());

			conversations.countCreatedByContactSince.mockResolvedValue(10);

			await service.send(BUYER, STORE, 'oi');

			expect(conversations.ensure).not.toHaveBeenCalled();
			expect(messages.saveIncoming).toHaveBeenCalledTimes(1);
		});

		it('stores the message once when another first message got there first', async () => {
			const { service, conversations, messages } = build();

			conversations.ensure.mockResolvedValue({
				conversation: conversation(),
				created: false,
			});

			await expect(service.send(BUYER, STORE, 'oi')).resolves.toMatchObject({
				fromMe: true,
			});
			expect(messages.saveIncoming).toHaveBeenCalledTimes(1);
		});
	});

	describe('listMessages', () => {
		it('is empty before the first message, once the store is known to be usable', async () => {
			const { service, stores, messages } = build();

			await expect(service.listMessages(BUYER, STORE)).resolves.toEqual([]);
			expect(stores.findUsable).toHaveBeenCalledWith(STORE);
			expect(messages.listByConversation).not.toHaveBeenCalled();
		});

		it('looks the conversation up by the account own key only', async () => {
			const { service, conversations } = build(conversation());

			await service.listMessages(BUYER, STORE, 'm0');

			expect(conversations.findByContact).toHaveBeenCalledWith(BUYER.userId, {
				channel: 'STORE',
				contactKey: KEY,
			});
		});

		it('says who wrote and hides who answered at the store', async () => {
			const { service, messages } = build(conversation());

			messages.listByConversation.mockResolvedValue([
				{
					_id: 'm2',
					direction: 'OUT',
					text: 'temos',
					sentAt: new Date('2030-01-04'),
					sentByEmployeeId: 'e1',
					sender: { id: 'x' },
					raw: { a: 1 },
					kind: 'IMAGE',
					attachments: [
						{
							kind: 'IMAGE',
							mimeType: 'image/png',
							fileName: 'foto.png',
							size: 3,
							source: { type: 'STORED_FILE', key: 'stored.png' },
						},
					],
				},
				{
					_id: 'm1',
					direction: 'IN',
					text: 'oi',
					sentAt: new Date('2030-01-03'),
				},
			]);

			const before: string = '507f1f77bcf86cd799439055';

			const result = await service.listMessages(BUYER, STORE, before);

			expect(messages.listByConversation).toHaveBeenCalledWith(OWNER, CONV, {
				before,
			});
			expect(result).toEqual([
				{
					_id: 'm2',
					fromMe: false,
					kind: 'IMAGE',
					text: 'temos',
					attachments: [
						{
							index: 0,
							kind: 'IMAGE',
							mimeType: 'image/png',
							fileName: 'foto.png',
							size: 3,
							width: null,
							height: null,
							duration: null,
						},
					],
					sentAt: new Date('2030-01-04'),
					editedAt: null,
				},
				{
					_id: 'm1',
					fromMe: true,
					kind: 'TEXT',
					text: 'oi',
					attachments: [],
					sentAt: new Date('2030-01-03'),
					editedAt: null,
				},
			]);
			// Where a file is kept never reaches the customer.
			expect(JSON.stringify(result)).not.toContain('stored.png');
		});
	});

	it('listMessages ignores a "before" that is not an id', async () => {
		const { service, messages } = build(conversation());

		await service.listMessages(BUYER, STORE, 'nope');

		expect(messages.listByConversation).toHaveBeenCalledWith(OWNER, CONV, {
			before: undefined,
		});
	});

	describe('markRead', () => {
		it('zeroes the account side of its own conversation', async () => {
			const { service, conversations } = build(conversation());

			await service.markRead(BUYER, STORE);

			expect(conversations.markContactRead).toHaveBeenCalledWith(
				BUYER.userId,
				CONV,
			);
		});

		it('touches nothing when the account has no conversation with that store', async () => {
			const { service, conversations } = build();

			await service.markRead(BUYER, STORE);

			expect(conversations.markContactRead).not.toHaveBeenCalled();
		});
	});

	describe('listConversations', () => {
		it('lists the account conversations with the store card and its own unread', async () => {
			const { service, conversations } = build(conversation());

			const result = await service.listConversations(BUYER);

			expect(conversations.listByContactUser).toHaveBeenCalledWith(
				BUYER.userId,
			);
			expect(result).toEqual([
				{
					store: {
						_id: STORE,
						name: 'Loja Central',
						logo: null,
						description: null,
						type: null,
					},
					lastMessageAt: new Date('2030-01-02'),
					lastMessageText: 'oi',
					lastMessageKind: null,
					lastMessageFromMe: true,
					unreadCount: 2,
				},
			]);
		});
	});

	describe('sendMedia', () => {
		const file: any = {
			buffer: Buffer.from('abc'),
			fileName: 'foto.png',
			mimeType: 'image/png',
		};

		it('stores the file and sends it with its caption, telling the store', async () => {
			const { service, media, messages, conversations, realtime } = build(
				conversation(),
			);

			await service.sendMedia(BUYER, STORE, file, {
				caption: ' veja ',
				asVoice: false,
			});

			expect(media.store).toHaveBeenCalledWith(file, false);

			const input = messages.saveIncoming.mock.calls[0][2];

			expect(input).toMatchObject({ kind: 'IMAGE', text: 'veja' });
			expect(input.attachments[0].source).toEqual({
				type: 'STORED_FILE',
				key: 'stored.png',
			});
			expect(conversations.applyIncoming).toHaveBeenCalledWith(
				OWNER,
				CONV,
				expect.objectContaining({
					preview: expect.objectContaining({ kind: 'IMAGE', text: 'veja' }),
				}),
			);
			expect(realtime.notifyStoreChatUpdated).toHaveBeenCalled();
		});

		it('can be what opens the conversation, under the same daily limit', async () => {
			const { service, conversations, media } = build();

			await service.sendMedia(BUYER, STORE, file, {
				caption: null,
				asVoice: true,
			});

			expect(conversations.ensure).toHaveBeenCalled();
			expect(media.store).toHaveBeenCalledWith(file, true);

			conversations.countCreatedByContactSince.mockResolvedValue(10);
			media.store.mockClear();

			await expect(
				service.sendMedia(BUYER, STORE, file, {
					caption: null,
					asVoice: false,
				}),
			).rejects.toMatchObject({ status: 429 });
			expect(media.store).not.toHaveBeenCalled();
		});

		it.each([
			[
				'a file that cannot be sent',
				(mocks: any) =>
					mocks.media.assertSendable.mockImplementation(() => {
						throw new BadRequestException('too large');
					}),
			],
			[
				'a store that is not usable',
				(mocks: any) =>
					mocks.stores.findUsable.mockRejectedValue(
						new NotFoundException('Store not found.'),
					),
			],
			[
				'the account own store',
				(mocks: any) =>
					mocks.stores.findUsable.mockResolvedValue({
						_id: STORE,
						userId: BUYER.userId,
					}),
			],
		])('stores nothing for %s', async (_label, arrange) => {
			const mocks = build();

			arrange(mocks);

			await expect(
				mocks.service.sendMedia(BUYER, STORE, file, {
					caption: null,
					asVoice: false,
				}),
			).rejects.toBeDefined();
			expect(mocks.media.store).not.toHaveBeenCalled();
			expect(mocks.messages.saveIncoming).not.toHaveBeenCalled();
		});
	});

	describe('getAttachment', () => {
		const MSG: string = '507f1f77bcf86cd799439051';

		it('reads a file of a message of the account own conversation', async () => {
			const { service, messages, media } = build(conversation());

			await expect(
				service.getAttachment(BUYER, STORE, MSG, 0),
			).resolves.toMatchObject({ contentType: 'image/png' });
			expect(messages.findOwned).toHaveBeenCalledWith(OWNER, CONV, MSG);
			expect(media.read).toHaveBeenCalledWith(
				{ _id: 'm1', attachments: [{}] },
				0,
			);
		});

		it.each([
			['the account has no conversation with that store', false, MSG],
			['the id is not an id', true, 'nope'],
		])('finds nothing when %s', async (_label, hasConversation, messageId) => {
			const { service, media, messages } = build(
				hasConversation ? conversation() : null,
			);

			await expect(
				service.getAttachment(BUYER, STORE, messageId, 0),
			).rejects.toBeInstanceOf(NotFoundException);
			expect(messages.findOwned).not.toHaveBeenCalled();
			expect(media.read).not.toHaveBeenCalled();
		});

		it('finds nothing for a message of another conversation', async () => {
			const { service, messages, media } = build(conversation());

			messages.findOwned.mockResolvedValue(null);

			await expect(
				service.getAttachment(BUYER, STORE, MSG, 0),
			).rejects.toBeInstanceOf(NotFoundException);
			expect(media.read).not.toHaveBeenCalled();
		});
	});

	describe('editMessage', () => {
		it('changes, as the customer side, the words of a message of the account own conversation', async () => {
			const own = conversation();
			const { service, edition } = build(own);

			const view = await service.editMessage(BUYER, STORE, 'm1', '  oi!  ');

			expect(edition.edit).toHaveBeenCalledWith(own, 'm1', 'IN', 'oi!');
			expect(view).toMatchObject({
				_id: 'm1',
				fromMe: true,
				text: 'oi!',
				editedAt: new Date('2030-01-06'),
			});
		});

		it.each([
			['an empty text', '   '],
			['a text over the limit', 'a'.repeat(1001)],
		])('refuses %s', async (_name, text) => {
			const { service, edition } = build(conversation());

			await expect(
				service.editMessage(BUYER, STORE, 'm1', text),
			).rejects.toBeInstanceOf(BadRequestException);
			expect(edition.edit).not.toHaveBeenCalled();
		});

		it('finds nothing when the account has no conversation with that store', async () => {
			const { service, edition } = build();

			await expect(
				service.editMessage(BUYER, STORE, 'm1', 'oi'),
			).rejects.toBeInstanceOf(NotFoundException);
			expect(edition.edit).not.toHaveBeenCalled();
		});
	});

	describe('typing', () => {
		it('tells the store that the account is writing, storing nothing', async () => {
			const { service, realtime, messages } = build(conversation());

			realtime.notifyStoreChatTyping = jest.fn();

			await service.typing(BUYER, STORE);

			expect(realtime.notifyStoreChatTyping).toHaveBeenCalledWith(OWNER, {
				storeId: STORE,
				conversationId: CONV,
			});
			expect(messages.saveIncoming).not.toHaveBeenCalled();
		});

		it('tells nobody before there is a conversation, and opens none', async () => {
			const { service, realtime, conversations } = build();

			realtime.notifyStoreChatTyping = jest.fn();

			await service.typing(BUYER, STORE);

			expect(realtime.notifyStoreChatTyping).not.toHaveBeenCalled();
			expect(conversations.ensure).not.toHaveBeenCalled();
		});
	});

	describe('deleteMessage', () => {
		it('removes, as the customer side, a message of the account own conversation', async () => {
			const own = conversation();
			const { service, deletion } = build(own);

			await service.deleteMessage(BUYER, STORE, 'm1');

			expect(deletion.remove).toHaveBeenCalledWith(own, 'm1', 'IN');
		});

		it('finds nothing when the account has no conversation with that store', async () => {
			const { service, deletion } = build();

			await expect(
				service.deleteMessage(BUYER, STORE, 'm1'),
			).rejects.toBeInstanceOf(NotFoundException);
			expect(deletion.remove).not.toHaveBeenCalled();
		});
	});

	it('countUnread is what the account has not read', async () => {
		const { service } = build();

		await expect(service.countUnread(BUYER)).resolves.toBe(4);
	});
});
