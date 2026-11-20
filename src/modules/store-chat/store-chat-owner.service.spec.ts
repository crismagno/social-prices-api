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

	return {
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

	describe('start', () => {
		it.each([[''], ['   '], ['a'.repeat(1001)]])(
			'refuses the text %p',
			async (text) => {
				const { service, messages } = build();

				await expect(
					service.start(CTX, CUSTOMER, STORE, text),
				).rejects.toBeInstanceOf(BadRequestException);
				expect(messages.saveOutgoing).not.toHaveBeenCalled();
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

	it('countUnread is what the user has not read on this channel', async () => {
		const { service, conversations } = build();

		await expect(service.countUnread(OWNER)).resolves.toBe(7);
		expect(conversations.countUnread).toHaveBeenCalledWith(OWNER, 'STORE');
	});
});
