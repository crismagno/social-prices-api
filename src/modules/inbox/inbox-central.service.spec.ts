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
		create: jest.fn().mockResolvedValue({ _id: CU1 }),
		find: jest
			.fn()
			.mockReturnValue({ lean: jest.fn().mockResolvedValue(customers) }),
	};
	const convService: any = {
		listAll: jest.fn().mockResolvedValue(conversations),
		listByCustomer: jest.fn().mockResolvedValue(conversations),
		findById: jest.fn().mockResolvedValue(conversations[0] ?? null),
		markRead: jest.fn().mockResolvedValue(undefined),
		setLimbo: jest.fn().mockResolvedValue(undefined),
		setCustomer: jest.fn().mockResolvedValue(undefined),
	};
	const messages: any = {
		listTimeline: jest.fn().mockResolvedValue([]),
		findById: jest.fn(),
		conversationsAnswered: jest.fn().mockResolvedValue(new Set()),
	};
	const adapter: any = {
		sendTyping: jest.fn().mockResolvedValue(undefined),
		capabilities: {
			deleteMessage: true,
			editMessage: true,
			media: true,
			voice: true,
			maxUploadBytes: 10,
		},
		sendMedia: jest.fn().mockResolvedValue({
			_id: 'med1',
			conversationId: 'c1',
			channel: 'TELEGRAM',
			direction: 'OUT',
			kind: 'FILE',
			text: null,
			attachments: [],
			isUnsupported: false,
			sentAt: new Date('2030-01-05'),
			sentByEmployeeId: 'e1',
		}),
		deleteMessage: jest.fn().mockResolvedValue(undefined),
		editMessage: jest
			.fn()
			.mockImplementation(
				async (
					_owner: string,
					_conversation: any,
					message: any,
					text: string,
				) => ({
					...message,
					attachments: [],
					text,
					editedAt: new Date('2030-01-06'),
				}),
			),
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
	const featureLimits: any = {
		assertCanCreate: jest.fn().mockResolvedValue(undefined),
	};

	return {
		featureLimits,
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
			featureLimits,
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
			expect(rows[0].hasReplied).toBe(false);
		});

		it('says a chat was answered when the store wrote in any of its conversations', async () => {
			const { service, messages } = build(
				[
					conv({ _id: 'c1', customerId: CU1 }),
					conv({
						_id: 'c2',
						channel: 'INSTAGRAM',
						contactKey: 'ig1',
						customerId: CU1,
					}),
				],
				[{ _id: CU1, name: 'Ana Cliente', avatar: null }],
			);
			messages.conversationsAnswered.mockResolvedValue(new Set(['c2']));

			const rows = await service.listChats(OWNER);

			expect(rows[0].hasReplied).toBe(true);
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

	it('setLimbo sets aside every conversation of the customer', async () => {
		const { service, convService } = build([
			conv({ _id: 'c1', customerId: CU1 }),
			conv({ _id: 'c2', customerId: CU1 }),
		]);

		await service.setLimbo(OWNER, { customerId: CU1 }, true);

		expect(convService.setLimbo).toHaveBeenCalledWith(OWNER, 'c1', true);
		expect(convService.setLimbo).toHaveBeenCalledWith(OWNER, 'c2', true);
	});

	it('a chat is in the limbo only when all its conversations are', async () => {
		const { service } = build([
			conv({ _id: 'c1', customerId: CU1, limboAt: new Date() }),
			conv({ _id: 'c2', customerId: CU1, limboAt: null }),
		]);

		const [row] = await service.listChats(OWNER);

		expect(row.isInLimbo).toBe(false);
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

	describe('an app page asks for its own channel only', () => {
		it('lists only that channel, and reads, marks and lists messages only inside it', async () => {
			const { service, convService, messages } = build([
				conv({ _id: 'c1', customerId: CU1 }),
				conv({
					_id: 'c2',
					customerId: CU1,
					channel: 'INSTAGRAM',
					unreadCount: 3,
				}),
			]);

			const rows = await service.listChats(OWNER, 'INSTAGRAM' as any);
			expect(rows).toHaveLength(1);
			expect(rows[0].conversations.map((c) => c._id)).toEqual(['c2']);

			await service.listMessages(OWNER, {
				customerId: CU1,
				channel: 'INSTAGRAM' as any,
			});
			expect(messages.listTimeline.mock.calls[0][1]).toEqual(['c2']);

			await service.markRead(OWNER, {
				customerId: CU1,
				channel: 'TELEGRAM' as any,
			});
			expect(convService.markRead).toHaveBeenCalledTimes(1);
			expect(convService.markRead).toHaveBeenCalledWith(OWNER, 'c1');
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

	describe('createCustomer', () => {
		it('makes a customer from the person, within the plan limit, and ties the conversation to it', async () => {
			const { service, customerModel, featureLimits, convService } = build([
				conv({ _id: 'c1' }),
			]);
			// free uniqName first, then the new customer is found when tying
			customerModel.exists.mockResolvedValueOnce(null);

			await service.createCustomer(OWNER, 'c1');

			expect(featureLimits.assertCanCreate).toHaveBeenCalledWith(
				OWNER,
				'customers',
			);
			expect(customerModel.create).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'Ana T',
					about: '@ana',
					ownerUserId: OWNER,
					email: null,
					externalSources: [],
				}),
			);
			expect(convService.setCustomer).toHaveBeenCalledWith(OWNER, 'c1', CU1);
		});

		it('makes nothing at the limit, and refuses a conversation that already has a customer', async () => {
			const limit = build([conv()]);
			limit.featureLimits.assertCanCreate.mockRejectedValue(new Error('limit'));
			await expect(limit.service.createCustomer(OWNER, 'c1')).rejects.toThrow(
				'limit',
			);
			expect(limit.customerModel.create).not.toHaveBeenCalled();

			const tied = build([conv({ customerId: CU1 })]);
			await expect(
				tied.service.createCustomer(OWNER, 'c1'),
			).rejects.toBeInstanceOf(ConflictException);
			expect(tied.customerModel.create).not.toHaveBeenCalled();
		});
	});

	describe('deleteMessage', () => {
		const message = { _id: 'm1', conversationId: 'c1', channel: 'TELEGRAM' };

		it("asks the message's channel to remove it", async () => {
			const { service, messages, adapter } = build([conv()]);
			messages.findById.mockResolvedValue(message);

			await service.deleteMessage(OWNER, 'm1');

			expect(adapter.deleteMessage).toHaveBeenCalledWith(
				OWNER,
				conv(),
				message,
			);
		});

		it('refuses a channel that cannot remove messages, and a message that is not there', async () => {
			const noDelete = build([conv()]);
			noDelete.messages.findById.mockResolvedValue(message);
			noDelete.adapter.capabilities.deleteMessage = false;
			await expect(
				noDelete.service.deleteMessage(OWNER, 'm1'),
			).rejects.toBeInstanceOf(ConflictException);
			expect(noDelete.adapter.deleteMessage).not.toHaveBeenCalled();

			const none = build([conv()]);
			none.messages.findById.mockResolvedValue(null);
			await expect(
				none.service.deleteMessage(OWNER, 'm1'),
			).rejects.toBeInstanceOf(NotFoundException);
		});

		it('refuses a channel whose app is not enabled', async () => {
			const { service, messages, usersService } = build([conv()]);
			messages.findById.mockResolvedValue(message);
			usersService.findOneById.mockResolvedValue({ enabledApps: [] });

			await expect(service.deleteMessage(OWNER, 'm1')).rejects.toBeInstanceOf(
				AppNotEnabledException,
			);
		});

		it('tells each message of the timeline whether its channel allows removing it', async () => {
			const { service, messages, adapter } = build([conv({ customerId: CU1 })]);
			messages.listTimeline.mockResolvedValue([
				{ ...message, attachments: [] },
			]);

			expect(
				(await service.listMessages(OWNER, { customerId: CU1 }))[0].canDelete,
			).toBe(true);

			adapter.capabilities.deleteMessage = false;
			expect(
				(await service.listMessages(OWNER, { customerId: CU1 }))[0].canDelete,
			).toBe(false);
		});
	});

	describe('editMessage', () => {
		const message = {
			_id: 'm1',
			conversationId: 'c1',
			channel: 'TELEGRAM',
			direction: 'OUT',
			kind: 'TEXT',
			text: 'ola',
		};

		it("asks the message's channel to change its words and gives it back as it is now", async () => {
			const { service, messages, adapter } = build([conv()]);
			messages.findById.mockResolvedValue(message);

			const view = await service.editMessage(OWNER, 'm1', '  olá!  ');

			expect(adapter.editMessage).toHaveBeenCalledWith(
				OWNER,
				conv(),
				message,
				'olá!',
			);
			expect(view).toMatchObject({
				_id: 'm1',
				text: 'olá!',
				editedAt: new Date('2030-01-06'),
				canEdit: true,
			});
		});

		it('refuses an empty text before looking for the message', async () => {
			const { service, messages } = build([conv()]);

			await expect(
				service.editMessage(OWNER, 'm1', '   '),
			).rejects.toBeInstanceOf(BadRequestException);
			expect(messages.findById).not.toHaveBeenCalled();
		});

		it('refuses a message that is not there', async () => {
			const { service, messages, adapter } = build([conv()]);
			messages.findById.mockResolvedValue(null);

			await expect(
				service.editMessage(OWNER, 'm1', 'novo'),
			).rejects.toBeInstanceOf(NotFoundException);
			expect(adapter.editMessage).not.toHaveBeenCalled();
		});

		it.each([
			[
				'a channel that cannot change messages',
				(adapter: any) => (adapter.capabilities.editMessage = false),
			],
			[
				'a channel with no way to do it',
				(adapter: any) => (adapter.editMessage = undefined),
			],
			[
				'a message the channel keeps as it is',
				(adapter: any) => (adapter.canEditMessage = () => false),
			],
		])('refuses %s', async (_name, arrange) => {
			const { service, messages, adapter } = build([conv()]);
			const edit = adapter.editMessage;
			messages.findById.mockResolvedValue(message);
			arrange(adapter);

			await expect(
				service.editMessage(OWNER, 'm1', 'novo'),
			).rejects.toBeInstanceOf(ConflictException);
			expect(edit).not.toHaveBeenCalled();
		});

		it('refuses a channel whose app is not enabled', async () => {
			const { service, messages, usersService } = build([conv()]);
			messages.findById.mockResolvedValue(message);
			usersService.findOneById.mockResolvedValue({ enabledApps: [] });

			await expect(
				service.editMessage(OWNER, 'm1', 'novo'),
			).rejects.toBeInstanceOf(AppNotEnabledException);
		});

		it('tells each message of the timeline whether its words can be changed, and when they were', async () => {
			const { service, messages, adapter } = build([conv({ customerId: CU1 })]);
			const editedAt = new Date('2030-01-06');
			messages.listTimeline.mockResolvedValue([
				{ ...message, attachments: [], editedAt },
				{ ...message, _id: 'm2', direction: 'IN', attachments: [] },
			]);
			adapter.canEditMessage = (item: any) => item.direction === 'OUT';

			const views = await service.listMessages(OWNER, { customerId: CU1 });

			expect(views.map((view: any) => view.canEdit)).toEqual([true, false]);
			expect(views.map((view: any) => view.editedAt)).toEqual([editedAt, null]);

			adapter.capabilities.editMessage = false;
			expect(
				(await service.listMessages(OWNER, { customerId: CU1 }))[0].canEdit,
			).toBe(false);
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

	describe('typing', () => {
		const ctx = { ownerUserId: OWNER, employeeId: 'e1' };

		it('lets the person see "typing…" through the conversation\'s channel', async () => {
			const { service, adapter } = build([conv()]);

			await service.typing(ctx, 'c1');

			expect(adapter.sendTyping).toHaveBeenCalledWith(ctx, conv());
		});

		it('does nothing when the answer window is closed or the channel has no such signal', async () => {
			const closed = build([conv()]);
			closed.adapter.canReply.mockReturnValue({
				allowed: false,
				windowEndsAt: new Date(0),
			});
			await closed.service.typing(ctx, 'c1');
			expect(closed.adapter.sendTyping).not.toHaveBeenCalled();

			const none = build([conv()]);
			delete none.adapter.sendTyping;
			await expect(none.service.typing(ctx, 'c1')).resolves.toBeUndefined();
		});

		it('refuses a channel whose app is not enabled', async () => {
			const { service, usersService } = build([conv()]);
			usersService.findOneById.mockResolvedValue({ enabledApps: [] });

			await expect(service.typing(ctx, 'c1')).rejects.toBeInstanceOf(
				AppNotEnabledException,
			);
		});
	});

	describe('getSendTarget', () => {
		it('says what the conversation takes now: window, files and their limit', async () => {
			const open = build([conv()]);

			await expect(
				open.service.getSendTarget(OWNER, 'c1'),
			).resolves.toMatchObject({
				conversation: conv(),
				canReply: true,
				canSendMedia: true,
				capabilities: { maxUploadBytes: 10 },
			});

			const closed = build([conv()]);
			closed.adapter.canReply.mockReturnValue({
				allowed: false,
				windowEndsAt: null,
			});
			closed.adapter.capabilities.media = false;

			await expect(
				closed.service.getSendTarget(OWNER, 'c1'),
			).resolves.toMatchObject({
				canReply: false,
				canSendMedia: false,
			});
		});

		it('is 404 for a conversation that is not the owner', async () => {
			const { service } = build([]);

			await expect(service.getSendTarget(OWNER, 'c1')).rejects.toThrow(
				'Conversation not found.',
			);
		});

		it('finds the conversation by the person on a channel, for an app that only knows its own id of them', async () => {
			const { service, convService } = build([conv()]);
			convService.findByKey = jest.fn().mockResolvedValue(conv());

			await expect(
				service.getSendTarget(OWNER, {
					channel: 'TELEGRAM',
					contactKey: '555',
				} as any),
			).resolves.toMatchObject({ conversation: conv(), canReply: true });
			expect(convService.findByKey).toHaveBeenCalledWith(OWNER, {
				channel: 'TELEGRAM',
				contactKey: '555',
			});
			expect(convService.findById).not.toHaveBeenCalled();
		});

		it('is 404 when nobody wrote from that contact on that channel', async () => {
			const { service, convService } = build([]);
			convService.findByKey = jest.fn().mockResolvedValue(null);

			await expect(
				service.getSendTarget(OWNER, {
					channel: 'TELEGRAM',
					contactKey: '9',
				} as any),
			).rejects.toThrow('Conversation not found.');
		});
	});

	describe('sendMedia', () => {
		const ctx = { ownerUserId: OWNER, employeeId: 'e1' };
		const file = {
			buffer: Buffer.alloc(4),
			fileName: 'a.pdf',
			mimeType: 'application/pdf',
		};
		const options = { caption: 'segue', asVoice: false };

		it("sends the file through the conversation's channel and returns the message", async () => {
			const { service, adapter } = build([conv()]);

			const result = await service.sendMedia(ctx, 'c1', file, options);

			expect(adapter.sendMedia).toHaveBeenCalledWith(
				ctx,
				conv(),
				file,
				options,
			);
			expect(result).toMatchObject({ _id: 'med1', direction: 'OUT' });
		});

		it('refuses where nothing is taken: a channel with no files, no recordings, a file too large, a closed window', async () => {
			const noMedia = build([conv()]);
			noMedia.adapter.capabilities.media = false;
			await expect(
				noMedia.service.sendMedia(ctx, 'c1', file, options),
			).rejects.toBeInstanceOf(ConflictException);

			const noVoice = build([conv()]);
			noVoice.adapter.capabilities.voice = false;
			await expect(
				noVoice.service.sendMedia(ctx, 'c1', file, {
					caption: null,
					asVoice: true,
				}),
			).rejects.toBeInstanceOf(ConflictException);

			const big = build([conv()]);
			big.adapter.capabilities.maxUploadBytes = 3;
			await expect(
				big.service.sendMedia(ctx, 'c1', file, options),
			).rejects.toBeInstanceOf(BadRequestException);

			const closed = build([conv()]);
			closed.adapter.canReply.mockReturnValue({
				allowed: false,
				windowEndsAt: new Date(0),
			});
			await expect(
				closed.service.sendMedia(ctx, 'c1', file, options),
			).rejects.toBeInstanceOf(ConflictException);

			for (const refused of [noMedia, noVoice, big, closed]) {
				expect(refused.adapter.sendMedia).not.toHaveBeenCalled();
			}
		});

		it('refuses a channel whose app is not enabled', async () => {
			const { service, usersService } = build([conv()]);
			usersService.findOneById.mockResolvedValue({ enabledApps: [] });

			await expect(
				service.sendMedia(ctx, 'c1', file, options),
			).rejects.toBeInstanceOf(AppNotEnabledException);
		});

		it('tells each conversation what its channel takes', async () => {
			const { service } = build([conv({ customerId: CU1 })]);

			const [row] = await service.listChats(OWNER);

			expect(row.conversations[0]).toMatchObject({
				canSendMedia: true,
				canSendVoice: true,
				maxUploadBytes: 10,
			});
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

describe('InboxCentralService: a channel that belongs to no app (STORE)', () => {
	const store = (over: any = {}): any =>
		conv({
			_id: 's1',
			channel: 'STORE',
			contactKey: 'u9:st1',
			accountKey: 'st1',
			...over,
		});

	it.each([[[]], [undefined]])(
		'lists it for a user whose enabled apps are %p, and hides the app channels',
		async (enabledApps) => {
			const { service, usersService } = build([
				store(),
				conv({ _id: 'w1', channel: 'WHATSAPP' }),
			]);

			usersService.findOneById.mockResolvedValue({ enabledApps });

			const rows = await service.listChats(OWNER);

			expect(rows).toHaveLength(1);
			expect(rows[0].channels).toEqual(['STORE']);
		},
	);

	it('answers through it with no app enabled', async () => {
		const { service, usersService, adapter } = build([store()]);

		usersService.findOneById.mockResolvedValue({ enabledApps: [] });

		await service.reply({ ownerUserId: OWNER, employeeId: null }, 's1', 'oi');

		expect(adapter.sendText).toHaveBeenCalled();
	});

	it('tells the store chat, not an app, when its customer changes', async () => {
		const { service, realtime } = build([store()]);

		realtime.notifyStoreChatUpdated = jest.fn();

		await service.assignCustomer(OWNER, 's1', CU1);

		expect(realtime.notifyStoreChatUpdated).toHaveBeenCalledWith(OWNER, {
			storeId: 'st1',
			conversationId: 's1',
		});
		expect(realtime.notifyInboxUpdated).not.toHaveBeenCalled();
	});
});

describe('InboxCentralService: a channel that lets only some messages go', () => {
	const message = (direction: string): any => ({
		_id: 'm1',
		conversationId: 's1',
		channel: 'STORE',
		direction,
		kind: 'TEXT',
		text: 'oi',
		attachments: [],
		sentAt: new Date('2030-01-04'),
	});

	it('marks as removable only the messages the channel says', async () => {
		const { service, messages, adapter } = build([
			conv({ _id: 's1', channel: 'STORE', accountKey: 'st1' }),
		]);

		adapter.canDeleteMessage = (item: any) => item.direction === 'OUT';
		messages.listTimeline.mockResolvedValue([message('OUT'), message('IN')]);

		const views = await service.listMessages(OWNER, { conversationId: 's1' });

		expect(views.map((view: any) => view.canDelete)).toEqual([true, false]);
	});

	it('refuses to remove one the channel keeps', async () => {
		const { service, messages, adapter } = build([
			conv({ _id: 's1', channel: 'STORE', accountKey: 'st1' }),
		]);

		adapter.canDeleteMessage = () => false;
		messages.findById.mockResolvedValue(message('IN'));

		await expect(service.deleteMessage(OWNER, 'm1')).rejects.toBeInstanceOf(
			ConflictException,
		);
		expect(adapter.deleteMessage).not.toHaveBeenCalled();
	});
});
