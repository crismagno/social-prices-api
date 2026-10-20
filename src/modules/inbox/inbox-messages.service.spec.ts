import { InboxMessagesService } from './inbox-messages.service';
import InboxEnum from './interfaces/inbox.enum';

const OWNER = '507f1f77bcf86cd799439011';
const MSG = '507f1f77bcf86cd799439033';
const PIVOT = '507f1f77bcf86cd799439044';
const CONV = {
	_id: '507f1f77bcf86cd799439022',
	channel: InboxEnum.Channel.TELEGRAM,
};

const input = (over: any = {}): any => ({
	channelMessageId: '7',
	kind: InboxEnum.MessageKind.TEXT,
	text: 'oi',
	attachments: [],
	sentAt: new Date('2030-01-01'),
	...over,
});

const build = () => {
	const chain: any = {
		sort: jest.fn().mockReturnThis(),
		limit: jest.fn().mockReturnThis(),
		lean: jest.fn().mockResolvedValue([{ _id: 'm1' }]),
	};
	const model: any = {
		create: jest.fn().mockResolvedValue({ _id: 'm1' }),
		findOneAndUpdate: jest.fn().mockResolvedValue({ _id: 'out1' }),
		updateOne: jest.fn().mockResolvedValue({}),
		deleteOne: jest.fn().mockResolvedValue({}),
		find: jest.fn().mockReturnValue(chain),
		findOne: jest.fn().mockReturnValue({
			lean: jest.fn().mockResolvedValue({ _id: 'm1' }),
			sort: jest.fn().mockReturnThis(),
		}),
	};

	return { model, chain, service: new InboxMessagesService(model) };
};

describe('InboxMessagesService', () => {
	describe('saveIncoming', () => {
		it('stores a customer message as IN, with everything the channel gave and when it was stored', async () => {
			const { service, model } = build();
			const raw = { update_id: 1 };

			await expect(
				service.saveIncoming(
					OWNER,
					CONV,
					input({
						sender: { id: '555', name: 'Ana', username: 'ana_s' },
						channelData: { updateId: 1 },
						raw,
					}),
				),
			).resolves.toBe(true);

			expect(model.create).toHaveBeenCalledWith({
				ownerUserId: OWNER,
				conversationId: CONV._id,
				channel: 'TELEGRAM',
				direction: 'IN',
				channelMessageId: '7',
				kind: 'TEXT',
				text: 'oi',
				attachments: [],
				sender: { id: '555', name: 'Ana', username: 'ana_s' },
				sentAt: new Date('2030-01-01'),
				receivedAt: expect.any(Date),
				sentByEmployeeId: null,
				isEcho: false,
				isUnsupported: false,
				channelData: { updateId: 1 },
				raw,
			});
		});

		it('says false for a message that was already stored (a repeated delivery)', async () => {
			const { service, model } = build();
			model.create.mockRejectedValue({ code: 11000 });

			await expect(service.saveIncoming(OWNER, CONV, input())).resolves.toBe(
				false,
			);
		});

		it('lets any other failure through, so the channel delivers again', async () => {
			const { service, model } = build();
			model.create.mockRejectedValue(new Error('db down'));

			await expect(service.saveIncoming(OWNER, CONV, input())).rejects.toThrow(
				'db down',
			);
		});
	});

	describe('saveOutgoing', () => {
		it('stores a reply sent from here as OUT, with who sent it; one the channel echoed first only gains the sender', async () => {
			const { service, model } = build();

			await service.saveOutgoing(
				OWNER,
				CONV,
				input({ channelMessageId: '42', sentByEmployeeId: 'e1' }),
			);

			const [filter, update, options] = model.findOneAndUpdate.mock.calls[0];

			expect(filter).toEqual({
				ownerUserId: OWNER,
				conversationId: CONV._id,
				channelMessageId: '42',
				direction: 'OUT',
			});
			expect(update.$setOnInsert).toMatchObject({
				channel: 'TELEGRAM',
				kind: 'TEXT',
				text: 'oi',
				isEcho: false,
				receivedAt: expect.any(Date),
			});
			expect(update.$set).toEqual({ sentByEmployeeId: 'e1' });
			// Mongo refuses an update that touches one path under two operators
			// (ConflictingUpdateOperators), which made every reply fail with a 500.
			expect(Object.keys(update.$setOnInsert)).not.toContain(
				'sentByEmployeeId',
			);
			expect(options).toMatchObject({ upsert: true, new: true });
		});
	});

	describe('saveEcho', () => {
		it('stores what the account sent outside this system, as OUT with no employee, flagged as an echo', async () => {
			const { service, model } = build();

			await expect(
				service.saveEcho(OWNER, CONV, input({ channelMessageId: 'e1' })),
			).resolves.toBe(true);

			expect(model.create).toHaveBeenCalledWith(
				expect.objectContaining({
					direction: 'OUT',
					isEcho: true,
					sentByEmployeeId: null,
				}),
			);
		});

		it('says false when it is already stored, such as the echo of a reply sent from here', async () => {
			const { service, model } = build();
			model.create.mockRejectedValue({ code: 11000 });

			await expect(service.saveEcho(OWNER, CONV, input())).resolves.toBe(false);
		});

		it('gives the file its address when the reply sent from here was stored before its echo', async () => {
			const { service, model } = build();
			model.create.mockRejectedValue({ code: 11000 });
			const attachments = [
				{ kind: 'IMAGE', source: { type: 'URL', url: 'https://x/a.jpg' } },
			];

			await service.saveEcho(
				OWNER,
				CONV,
				input({ channelMessageId: 'e1', attachments }),
			);

			expect(model.updateOne).toHaveBeenCalledWith(
				{
					ownerUserId: OWNER,
					conversationId: CONV._id,
					channelMessageId: 'e1',
					direction: 'OUT',
					attachments: { $size: 0 },
				},
				{
					$set: { attachments },
					$unset: { 'channelData.localAttachment': '' },
				},
			);
		});

		it('leaves a stored message alone when its echo carries no file', async () => {
			const { service, model } = build();
			model.create.mockRejectedValue({ code: 11000 });

			await service.saveEcho(OWNER, CONV, input());

			expect(model.updateOne).not.toHaveBeenCalled();
		});
	});

	describe('listByConversation', () => {
		it('returns one conversation, newest first, for that owner only', async () => {
			const { service, model, chain } = build();

			await service.listByConversation(OWNER, CONV._id, {
				limit: 20,
				before: 'abc',
			});

			expect(model.find).toHaveBeenCalledWith({
				ownerUserId: OWNER,
				conversationId: CONV._id,
				deletedAt: null,
				_id: { $lt: 'abc' },
			});
			expect(chain.sort).toHaveBeenCalledWith({ _id: -1 });
			expect(chain.limit).toHaveBeenCalledWith(20);
		});

		it.each([
			[undefined, 50],
			[0, 1],
			[1000, 100],
		])('limit %p becomes %p', async (limit, expected) => {
			const { service, chain } = build();

			await service.listByConversation(OWNER, CONV._id, { limit });

			expect(chain.limit).toHaveBeenCalledWith(expected);
		});
	});

	describe('listTimeline: the messages of several conversations as one', () => {
		it('orders by when each was sent, then by id, over those conversations only', async () => {
			const { service, model, chain } = build();

			await service.listTimeline(OWNER, ['c1', 'c2'], { limit: 30 });

			expect(model.find).toHaveBeenCalledWith({
				ownerUserId: OWNER,
				conversationId: { $in: ['c1', 'c2'] },
				deletedAt: null,
			});
			expect(chain.sort).toHaveBeenCalledWith({ sentAt: -1, _id: -1 });
			expect(chain.limit).toHaveBeenCalledWith(30);
		});

		it('pages from a message: older by time, or older by id at the same time', async () => {
			const { service, model } = build();
			const sentAt = new Date('2030-01-05');
			model.findOne.mockReturnValue({
				lean: jest.fn().mockResolvedValue({ _id: PIVOT, sentAt }),
			});

			await service.listTimeline(OWNER, ['c1'], { before: PIVOT });

			expect(model.find.mock.calls[0][0]).toEqual({
				ownerUserId: OWNER,
				conversationId: { $in: ['c1'] },
				deletedAt: null,
				$or: [{ sentAt: { $lt: sentAt } }, { sentAt, _id: { $lt: PIVOT } }],
			});
		});

		it('is empty for no conversations, without asking the database', async () => {
			const { service, model } = build();

			await expect(service.listTimeline(OWNER, [], {})).resolves.toEqual([]);
			expect(model.find).not.toHaveBeenCalled();
		});
	});

	describe('one message', () => {
		it('findById is null for something that is not an id, without asking the database', async () => {
			const { service, model } = build();

			await expect(service.findById(OWNER, 'nope')).resolves.toBeNull();
			expect(model.findOne).not.toHaveBeenCalled();
		});

		it('findOwned, deleteOwned and findLatest stay inside the owner and the conversation', async () => {
			const { service, model } = build();

			await service.findOwned(OWNER, CONV._id, 'm1');
			await service.deleteOwned(OWNER, CONV._id, 'm1');
			await service.findLatest(OWNER, CONV._id);

			expect(model.findOne).toHaveBeenNthCalledWith(1, {
				_id: 'm1',
				ownerUserId: OWNER,
				conversationId: CONV._id,
				deletedAt: null,
			});
			expect(model.deleteOne).toHaveBeenCalledWith({
				_id: 'm1',
				ownerUserId: OWNER,
				conversationId: CONV._id,
			});
			expect(model.findOne).toHaveBeenNthCalledWith(2, {
				ownerUserId: OWNER,
				conversationId: CONV._id,
				deletedAt: null,
			});
		});

		it('softDeleteOwned hides the message but keeps it, so a redelivery cannot bring it back', async () => {
			const { service, model } = build();
			model.updateOne.mockResolvedValue({ modifiedCount: 1 });

			await expect(service.softDeleteOwned(OWNER, CONV._id, MSG)).resolves.toBe(
				true,
			);
			expect(model.updateOne).toHaveBeenCalledWith(
				{
					_id: MSG,
					ownerUserId: OWNER,
					conversationId: CONV._id,
					deletedAt: null,
				},
				{ $set: { deletedAt: expect.any(Date) } },
			);

			model.updateOne.mockResolvedValue({ modifiedCount: 0 });
			await expect(service.softDeleteOwned(OWNER, CONV._id, MSG)).resolves.toBe(
				false,
			);
			await expect(
				service.softDeleteOwned(OWNER, CONV._id, 'not-an-id'),
			).resolves.toBe(false);
		});

		it('findById finds a message of this owner in any of their conversations', async () => {
			const { service, model } = build();

			await service.findById(OWNER, MSG);

			expect(model.findOne).toHaveBeenCalledWith({
				_id: MSG,
				ownerUserId: OWNER,
				deletedAt: null,
			});
		});
	});
});
