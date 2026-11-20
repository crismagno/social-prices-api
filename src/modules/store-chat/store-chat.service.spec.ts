import { BadRequestException, HttpException } from '@nestjs/common';

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
					text: 'oi',
					sentAt: new Date('2030-01-03'),
					channelMessageId,
				}),
			),
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

	return {
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
				text: 'oi',
				sentAt: new Date('2030-01-03'),
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
					text: 'temos',
					sentAt: new Date('2030-01-04'),
				},
				{ _id: 'm1', fromMe: true, text: 'oi', sentAt: new Date('2030-01-03') },
			]);
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
					lastMessageFromMe: true,
					unreadCount: 2,
				},
			]);
		});
	});

	it('countUnread is what the account has not read', async () => {
		const { service } = build();

		await expect(service.countUnread(BUYER)).resolves.toBe(4);
	});
});
