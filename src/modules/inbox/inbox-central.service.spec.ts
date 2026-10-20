import {
	BadRequestException,
	ConflictException,
	NotFoundException,
} from '@nestjs/common';

import { AppNotEnabledException } from '../apps/apps.exceptions';

import { InboxCentralService } from './inbox-central.service';

const OWNER = '507f1f77bcf86cd799439011';
const CU1 = '507f1f77bcf86cd799439021';

const conv = (over: any = {}): any => ({
	_id: 'c1',
	channel: 'TELEGRAM',
	contactKey: '555',
	contact: { name: 'Ana T', username: 'ana', profilePic: null },
	customerId: null,
	lastMessageAt: new Date('2030-01-03'),
	lastMessageText: 'oi',
	lastMessageKind: 'TEXT',
	lastMessageDirection: 'IN',
	unreadCount: 1,
	...over,
});

const build = (conversations: any[] = [], customers: any[] = []) => {
	const customerModel: any = {
		exists: jest.fn().mockResolvedValue({ _id: 'x' }),
		find: jest
			.fn()
			.mockReturnValue({ lean: jest.fn().mockResolvedValue(customers) }),
	};
	const convService: any = {
		listAll: jest.fn().mockResolvedValue(conversations),
		listByCustomer: jest.fn().mockResolvedValue(conversations),
		findById: jest.fn().mockResolvedValue(conversations[0] ?? null),
		markRead: jest.fn().mockResolvedValue(undefined),
		setCustomer: jest.fn().mockResolvedValue(undefined),
	};
	const messages: any = {
		listTimeline: jest.fn().mockResolvedValue([]),
		findById: jest.fn(),
	};
	const adapter: any = {
		canReply: jest.fn().mockReturnValue({ allowed: true, windowEndsAt: null }),
		sendText: jest.fn().mockResolvedValue({
			_id: 'out1',
			conversationId: 'c1',
			channel: 'TELEGRAM',
			direction: 'OUT',
			kind: 'TEXT',
			text: 'claro',
			attachments: [],
			isUnsupported: false,
			sentAt: new Date('2030-01-04'),
			sentByEmployeeId: 'e1',
		}),
		fetchAttachment: jest.fn().mockResolvedValue({
			buffer: Buffer.alloc(1),
			contentType: 'image/png',
			fileName: null,
		}),
	};
	const registry: any = { get: jest.fn().mockReturnValue(adapter) };

	const usersService: any = {
		findOneById: jest.fn().mockResolvedValue({
			enabledApps: ['TELEGRAM', 'FACEBOOK', 'INSTAGRAM'],
		}),
	};
	const realtime: any = { notifyInboxUpdated: jest.fn() };

	return {
		usersService,
		realtime,
		customerModel,
		convService,
		messages,
		adapter,
		registry,
		service: new InboxCentralService(
			customerModel,
			convService,
			messages,
			registry,
			usersService,
			realtime,
		),
	};
};

describe('InboxCentralService', () => {
	describe('listChats', () => {
		it("puts a customer's conversations of every channel in one row", async () => {
			const { service } = build(
				[
					conv({ _id: 'c1', customerId: CU1, unreadCount: 2 }),
					conv({
						_id: 'c2',
						channel: 'INSTAGRAM',
						contactKey: 'ig1',
						customerId: CU1,
						lastMessageAt: new Date('2030-01-01'),
						unreadCount: 1,
					}),
				],
				[{ _id: CU1, name: 'Ana Cliente', avatar: 'a.png' }],
			);

			const rows = await service.listChats(OWNER);

			expect(rows).toHaveLength(1);
			expect(rows[0]).toMatchObject({
				key: CU1,
				customerId: CU1,
				name: 'Ana Cliente',
				avatar: 'a.png',
				channels: ['TELEGRAM', 'INSTAGRAM'],
				unreadCount: 3,
				lastMessageChannel: 'TELEGRAM',
				lastMessageText: 'oi',
			});
			expect(rows[0].conversations.map((c) => c._id)).toEqual(['c1', 'c2']);
		});

		it('lists a person with no customer alone, named by what the channel says', async () => {
			const { service } = build([conv()]);

			const [row] = await service.listChats(OWNER);

			expect(row).toMatchObject({
				key: 'conversation:c1',
				customerId: null,
				name: 'Ana T',
				avatar: null,
			});
		});

		it('orders the rows by their last message, most recent first', async () => {
			const { service } = build([
				conv({ _id: 'old', lastMessageAt: new Date('2030-01-01') }),
				conv({ _id: 'new', lastMessageAt: new Date('2030-02-01') }),
			]);

			const rows = await service.listChats(OWNER);

			expect(rows.map((r) => r.key)).toEqual([
				'conversation:new',
				'conversation:old',
			]);
		});

		it('asks for customers only when a conversation has one', async () => {
			const { service, customerModel } = build([conv()]);

			await service.listChats(OWNER);

			expect(customerModel.find).not.toHaveBeenCalled();
		});
	});

	describe('listMessages', () => {
		it("reads a customer's timeline over all their conversations, without the raw event or any file address", async () => {
			const { service, convService, messages } = build([
				conv({ _id: 'c1', customerId: CU1 }),
				conv({ _id: 'c2', customerId: CU1 }),
			]);
			messages.listTimeline.mockResolvedValue([
				{
					_id: 'm1',
					conversationId: 'c1',
					channel: 'TELEGRAM',
					direction: 'IN',
					kind: 'IMAGE',
					text: null,
					attachments: [
						{
							kind: 'IMAGE',
							mimeType: 'image/png',
							fileName: null,
							size: 3,
							width: 1,
							height: 1,
							duration: null,
							source: { type: 'URL', url: 'https://secret' },
						},
					],
					isUnsupported: false,
					sentAt: new Date('2030-01-01'),
					sentByEmployeeId: null,
					raw: { big: true },
				},
			]);

			const result = await service.listMessages(
				OWNER,
				{ customerId: CU1 },
				{ limit: 10, before: 'x' },
			);

			expect(convService.listByCustomer).toHaveBeenCalledWith(OWNER, CU1);
			expect(messages.listTimeline).toHaveBeenCalledWith(OWNER, ['c1', 'c2'], {
				limit: 10,
				before: 'x',
			});
			expect(result[0]).not.toHaveProperty('raw');
			expect(JSON.stringify(result)).not.toContain('secret');
			expect(result[0].attachments).toEqual([
				{
					index: 0,
					kind: 'IMAGE',
					mimeType: 'image/png',
					fileName: null,
					size: 3,
					width: 1,
					height: 1,
					duration: null,
				},
			]);
		});

		it('reads one conversation when asked for that, and nothing for a foreign one', async () => {
			const own = build([conv({ _id: 'c1' })]);
			await own.service.listMessages(OWNER, { conversationId: 'c1' });
			expect(own.messages.listTimeline.mock.calls[0][1]).toEqual(['c1']);

			const foreign = build([]);
			await expect(
				foreign.service.listMessages(OWNER, { conversationId: 'zzz' }),
			).resolves.toEqual([]);
			expect(foreign.messages.listTimeline.mock.calls[0][1]).toEqual([]);
		});

		it('reads nothing when no scope is given', async () => {
			const { service, messages } = build([conv()]);

			await service.listMessages(OWNER, {});

			expect(messages.listTimeline.mock.calls[0][1]).toEqual([]);
		});
	});

	it('markRead clears only the conversations that have unread messages', async () => {
		const { service, convService } = build([
			conv({ _id: 'c1', customerId: CU1, unreadCount: 2 }),
			conv({ _id: 'c2', customerId: CU1, unreadCount: 0 }),
		]);

		await service.markRead(OWNER, { customerId: CU1 });

		expect(convService.markRead).toHaveBeenCalledTimes(1);
		expect(convService.markRead).toHaveBeenCalledWith(OWNER, 'c1');
	});

	it("summary lists a customer's conversations", async () => {
		const { service } = build([conv({ _id: 'c1', customerId: CU1 })]);

		await expect(service.summary(OWNER, CU1)).resolves.toEqual([
			expect.objectContaining({
				_id: 'c1',
				channel: 'TELEGRAM',
				contactKey: '555',
			}),
		]);
	});

	describe('getAttachment', () => {
		const message = { _id: 'm1', conversationId: 'c1', attachments: [{}] };

		it("asks the message's channel for the file", async () => {
			const { service, messages, registry, adapter, convService } = build([
				conv(),
			]);
			messages.findById.mockResolvedValue(message);

			const file = await service.getAttachment(OWNER, 'm1', 0);

			expect(convService.findById).toHaveBeenCalledWith(OWNER, 'c1');
			expect(registry.get).toHaveBeenCalledWith('TELEGRAM');
			expect(adapter.fetchAttachment).toHaveBeenCalledWith(
				OWNER,
				conv(),
				message,
				0,
			);
			expect(file.contentType).toBe('image/png');
		});

		it('refuses a message that is not there, or a file it does not have', async () => {
			const none = build([conv()]);
			none.messages.findById.mockResolvedValue(null);
			await expect(
				none.service.getAttachment(OWNER, 'm1', 0),
			).rejects.toBeInstanceOf(NotFoundException);

			const noFile = build([conv()]);
			noFile.messages.findById.mockResolvedValue(message);
			await expect(
				noFile.service.getAttachment(OWNER, 'm1', 3),
			).rejects.toBeInstanceOf(NotFoundException);
		});
	});

	describe('channels whose app is not enabled', () => {
		it('stay out of the list, the timeline and the files', async () => {
			const { service, usersService, messages, convService } = build([
				conv({ _id: 'c1', channel: 'INSTAGRAM' }),
				conv({ _id: 'c2' }),
			]);
			usersService.findOneById.mockResolvedValue({ enabledApps: ['TELEGRAM'] });

			const rows = await service.listChats(OWNER);
			expect(rows.map((r) => r.key)).toEqual(['conversation:c2']);

			await service.listMessages(OWNER, { conversationId: 'c1' });
			expect(messages.listTimeline.mock.calls[0][1]).toEqual([]);

			convService.findById.mockResolvedValue(conv({ channel: 'INSTAGRAM' }));
			messages.findById.mockResolvedValue({
				_id: 'm1',
				conversationId: 'c1',
				attachments: [{}],
			});
			await expect(
				service.getAttachment(OWNER, 'm1', 0),
			).rejects.toBeInstanceOf(AppNotEnabledException);
		});
	});

	describe('assignCustomer', () => {
		it('ties, moves or frees a conversation, whose history goes with it', async () => {
			const { service, convService, realtime } = build([
				conv({ _id: 'c1', customerId: CU1 }),
			]);

			const row = await service.assignCustomer(OWNER, 'c1', CU1);

			expect(convService.setCustomer).toHaveBeenCalledWith(OWNER, 'c1', CU1);
			expect(realtime.notifyInboxUpdated).toHaveBeenCalledWith(
				OWNER,
				'TELEGRAM',
				'555',
			);
			expect(row.conversations.map((c) => c._id)).toEqual(['c1']);

			await service.assignCustomer(OWNER, 'c1', null);
			expect(convService.setCustomer).toHaveBeenLastCalledWith(
				OWNER,
				'c1',
				null,
			);
		});

		it("refuses a customer that is not this owner's, and a conversation that is not there", async () => {
			const foreign = build([conv()]);
			foreign.customerModel.exists.mockResolvedValue(null);
			await expect(
				foreign.service.assignCustomer(OWNER, 'c1', CU1),
			).rejects.toBeInstanceOf(NotFoundException);
			expect(foreign.convService.setCustomer).not.toHaveBeenCalled();

			const none = build([]);
			await expect(
				none.service.assignCustomer(OWNER, 'zz', null),
			).rejects.toBeInstanceOf(NotFoundException);
		});
	});

	describe('reply', () => {
		const ctx = { ownerUserId: OWNER, employeeId: 'e1' };

		it("sends through the conversation's channel and returns the message", async () => {
			const { service, adapter, registry } = build([conv()]);

			const result = await service.reply(ctx, 'c1', '  claro  ');

			expect(registry.get).toHaveBeenCalledWith('TELEGRAM');
			expect(adapter.sendText).toHaveBeenCalledWith(ctx, conv(), 'claro');
			expect(result).toMatchObject({
				_id: 'out1',
				direction: 'OUT',
				text: 'claro',
			});
		});

		it('refuses an empty or too long text, and a closed answer window, without calling the channel', async () => {
			const { service, adapter } = build([conv()]);

			await expect(service.reply(ctx, 'c1', '   ')).rejects.toBeInstanceOf(
				BadRequestException,
			);
			await expect(
				service.reply(ctx, 'c1', 'a'.repeat(1001)),
			).rejects.toBeInstanceOf(BadRequestException);

			adapter.canReply.mockReturnValue({
				allowed: false,
				windowEndsAt: new Date(0),
			});
			await expect(service.reply(ctx, 'c1', 'oi')).rejects.toBeInstanceOf(
				ConflictException,
			);
			expect(adapter.sendText).not.toHaveBeenCalled();
		});

		it('refuses a channel whose app is not enabled', async () => {
			const { service, usersService } = build([conv()]);
			usersService.findOneById.mockResolvedValue({ enabledApps: [] });

			await expect(service.reply(ctx, 'c1', 'oi')).rejects.toBeInstanceOf(
				AppNotEnabledException,
			);
		});
	});

	describe('who an answer goes to by default', () => {
		it('is the conversation of the last message received, and each conversation says if it can be answered', async () => {
			const { service, adapter } = build([
				conv({
					_id: 'c1',
					customerId: CU1,
					lastIncomingAt: new Date('2030-01-01'),
				}),
				conv({
					_id: 'c2',
					channel: 'INSTAGRAM',
					customerId: CU1,
					lastMessageAt: new Date('2030-01-04'),
					lastIncomingAt: new Date('2030-01-02'),
				}),
			]);
			adapter.canReply.mockReturnValue({
				allowed: false,
				windowEndsAt: new Date('2030-01-03'),
			});

			const [row] = await service.listChats(OWNER);

			expect(row.replyConversationId).toBe('c2');
			expect(row.conversations[0]).toMatchObject({
				canReply: false,
				replyWindowEndsAt: new Date('2030-01-03'),
			});
		});
	});
});
