import { InboxConversationsService } from './inbox-conversations.service';
import InboxEnum from './interfaces/inbox.enum';

const OWNER = '507f1f77bcf86cd799439011';
const CONV = '507f1f77bcf86cd799439022';
const KEY = { channel: InboxEnum.Channel.TELEGRAM, contactKey: '555' };

const preview = (over: any = {}): any => ({
	text: 'oi',
	kind: InboxEnum.MessageKind.TEXT,
	channelKind: 'TEXT',
	direction: InboxEnum.Direction.IN,
	at: new Date('2030-01-01T10:00:00Z'),
	...over,
});

const build = () => {
	const chain: any = {
		sort: jest.fn().mockReturnThis(),
		limit: jest.fn().mockReturnThis(),
		lean: jest.fn().mockResolvedValue([]),
	};
	const model: any = {
		updateOne: jest.fn().mockResolvedValue({ upsertedCount: 0 }),
		findOne: jest.fn().mockResolvedValue({ _id: CONV }),
		findOneAndUpdate: jest.fn().mockResolvedValue({ lastMessageAt: null }),
		find: jest.fn().mockReturnValue(chain),
		aggregate: jest.fn().mockResolvedValue([{ total: 5 }]),
	};

	return { model, chain, service: new InboxConversationsService(model) };
};

describe('InboxConversationsService', () => {
	describe('ensure', () => {
		it('makes the conversation if it is not there, with what the channel says of the person, and says it was made', async () => {
			const { service, model } = build();
			model.updateOne.mockResolvedValue({ upsertedCount: 1 });

			const result = await service.ensure(OWNER, KEY, {
				accountKey: 'bot1',
				contact: {
					name: 'Ana',
					username: 'ana_s',
					extra: { telegramUserId: 555 },
				},
			});

			const [filter, update, options] = model.updateOne.mock.calls[0];

			expect(filter).toEqual({
				ownerUserId: OWNER,
				channel: 'TELEGRAM',
				contactKey: '555',
			});
			expect(update.$setOnInsert).toMatchObject({
				accountKey: 'bot1',
				contact: {
					name: 'Ana',
					username: 'ana_s',
					profilePic: null,
					languageCode: null,
					extra: { telegramUserId: 555 },
				},
				customerId: null,
				lastMessageAt: null,
				lastIncomingAt: new Date(0),
				unreadCount: 0,
			});
			expect(options).toEqual({ upsert: true });
			expect(result).toEqual({ conversation: { _id: CONV }, created: true });
		});

		it('leaves an existing conversation alone', async () => {
			const { service, model } = build();

			await expect(service.ensure(OWNER, KEY)).resolves.toMatchObject({
				created: false,
			});
			expect(model.updateOne.mock.calls[0][1]).not.toHaveProperty('$set');
		});
	});

	describe('applyIncoming', () => {
		it('moves the preview, opens the answer window, adds one unread and refreshes what the channel said of the person', async () => {
			const { service, model } = build();

			await service.applyIncoming(OWNER, CONV, {
				preview: preview(),
				accountKey: 'bot1',
				contact: { name: 'Ana', username: 'ana_s' },
			});

			const [filter, update, options] = model.findOneAndUpdate.mock.calls[0];

			expect(filter).toEqual({ _id: CONV, ownerUserId: OWNER });
			expect(update.$set).toEqual({
				accountKey: 'bot1',
				'contact.name': 'Ana',
				'contact.username': 'ana_s',
				lastMessageAt: preview().at,
				lastMessageText: 'oi',
				lastMessageKind: 'TEXT',
				lastMessageChannelKind: 'TEXT',
				lastMessageDirection: 'IN',
				lastIncomingAt: preview().at,
			});
			expect(update.$inc).toEqual({ unreadCount: 1 });
			expect(options).toEqual({ returnDocument: 'before' });
		});

		it('says it is the first message of the person when the conversation had none', async () => {
			const { service, model } = build();

			model.findOneAndUpdate.mockResolvedValue({ lastMessageAt: null });
			await expect(
				service.applyIncoming(OWNER, CONV, { preview: preview() }),
			).resolves.toBe(true);

			model.findOneAndUpdate.mockResolvedValue({
				lastMessageAt: new Date('2029-01-01'),
			});
			await expect(
				service.applyIncoming(OWNER, CONV, { preview: preview() }),
			).resolves.toBe(false);
		});

		it('cuts a long preview and leaves out what it was not given', async () => {
			const { service, model } = build();

			await service.applyIncoming(OWNER, CONV, {
				preview: preview({ text: 'x'.repeat(500) }),
			});

			const $set = model.findOneAndUpdate.mock.calls[0][1].$set;
			expect($set.lastMessageText).toHaveLength(200);
			expect($set).not.toHaveProperty('accountKey');
			expect($set).not.toHaveProperty('contact.name');
		});
	});

	describe('applyEcho', () => {
		it('moves the preview forward only: a late echo must not overwrite a newer last message', async () => {
			const { service, model } = build();
			const at = new Date('2030-01-03T10:00:00Z');

			await service.applyEcho(
				OWNER,
				CONV,
				preview({ at, direction: InboxEnum.Direction.OUT }),
			);

			const [filter, update] = model.updateOne.mock.calls[0];

			expect(filter).toEqual({
				_id: CONV,
				ownerUserId: OWNER,
				$or: [{ lastMessageAt: null }, { lastMessageAt: { $lte: at } }],
			});
			expect(update.$set).toMatchObject({
				lastMessageAt: at,
				lastMessageDirection: 'OUT',
			});
			expect(update).not.toHaveProperty('$inc');
			expect(JSON.stringify(update)).not.toContain('lastIncomingAt');
		});
	});

	it('applyOutgoing moves the preview, never the window or the unread count', async () => {
		const { service, model } = build();

		await service.applyOutgoing(
			OWNER,
			CONV,
			preview({ direction: InboxEnum.Direction.OUT }),
		);

		const [filter, update] = model.updateOne.mock.calls[0];

		expect(filter).toEqual({ _id: CONV, ownerUserId: OWNER });
		expect(update.$set).toMatchObject({ lastMessageDirection: 'OUT' });
		expect(update).not.toHaveProperty('$inc');
		expect(JSON.stringify(update)).not.toContain('lastIncomingAt');
	});

	it('setPreview points the inbox at the message that is now the newest, whichever way it went', async () => {
		const { service, model } = build();

		await service.setPreview(OWNER, CONV, preview());

		expect(model.updateOne).toHaveBeenCalledWith(
			{ _id: CONV, ownerUserId: OWNER },
			{
				$set: expect.objectContaining({
					lastMessageText: 'oi',
					lastMessageDirection: 'IN',
				}),
			},
		);
	});

	it('setContact keeps what the channel said of the person, field by field', async () => {
		const { service, model } = build();

		await service.setContact(OWNER, CONV, {
			name: 'Ana',
			profilePic: 'https://x/p.jpg',
		});

		expect(model.updateOne).toHaveBeenCalledWith(
			{ _id: CONV, ownerUserId: OWNER },
			{
				$set: {
					'contact.name': 'Ana',
					'contact.profilePic': 'https://x/p.jpg',
				},
			},
		);
	});

	it('markRead clears the unread count', async () => {
		const { service, model } = build();

		await service.markRead(OWNER, CONV);

		expect(model.updateOne).toHaveBeenCalledWith(
			{ _id: CONV, ownerUserId: OWNER },
			{ $set: { unreadCount: 0 } },
		);
	});

	describe('setCustomer', () => {
		it('ties or unties a conversation to a customer, noting when', async () => {
			const { service, model } = build();

			await service.setCustomer(OWNER, CONV, 'cu1');
			await service.setCustomer(OWNER, CONV, null);

			expect(model.updateOne.mock.calls[0][1].$set).toEqual({
				customerId: 'cu1',
				customerChangedAt: expect.any(Date),
			});
			expect(model.updateOne.mock.calls[1][1].$set).toEqual({
				customerId: null,
				customerChangedAt: expect.any(Date),
			});
		});
	});

	describe('reads', () => {
		it('findByKey and findById look only at that owner', async () => {
			const { service, model } = build();

			await service.findByKey(OWNER, KEY);
			await service.findById(OWNER, CONV);

			expect(model.findOne).toHaveBeenNthCalledWith(1, {
				ownerUserId: OWNER,
				channel: 'TELEGRAM',
				contactKey: '555',
			});
			expect(model.findOne).toHaveBeenNthCalledWith(2, {
				_id: CONV,
				ownerUserId: OWNER,
			});
		});

		it('findById is null for something that is not an id, without asking the database', async () => {
			const { service, model } = build();

			await expect(service.findById(OWNER, 'not-an-id')).resolves.toBeNull();
			expect(model.findOne).not.toHaveBeenCalled();
		});

		it('listByChannel returns one channel inbox, most recent first', async () => {
			const { service, model, chain } = build();

			await service.listByChannel(OWNER, InboxEnum.Channel.MESSENGER);

			expect(model.find).toHaveBeenCalledWith({
				ownerUserId: OWNER,
				channel: 'MESSENGER',
				lastMessageAt: { $ne: null },
			});
			expect(chain.sort).toHaveBeenCalledWith({ lastMessageAt: -1 });
			expect(chain.limit).toHaveBeenCalledWith(200);
		});

		it('listByCustomer returns everything a customer has, and listUnassigned what has no customer', async () => {
			const { service, model } = build();

			await service.listByCustomer(OWNER, 'cu1');
			await service.listUnassigned(OWNER);

			expect(model.find).toHaveBeenNthCalledWith(1, {
				ownerUserId: OWNER,
				customerId: 'cu1',
				lastMessageAt: { $ne: null },
			});
			expect(model.find).toHaveBeenNthCalledWith(2, {
				ownerUserId: OWNER,
				customerId: null,
				lastMessageAt: { $ne: null },
			});
		});

		it('a conversation that never got a message is not listed', async () => {
			const { service, model } = build();

			await service.listByChannel(OWNER, InboxEnum.Channel.TELEGRAM);

			expect(model.find.mock.calls[0][0].lastMessageAt).toEqual({ $ne: null });
		});
	});

	describe('countUnread', () => {
		it('adds up the unread messages of the owner, of one channel or of all', async () => {
			const { service, model } = build();

			await expect(service.countUnread(OWNER)).resolves.toBe(5);
			await service.countUnread(OWNER, InboxEnum.Channel.INSTAGRAM);

			const [all] = model.aggregate.mock.calls[0];
			expect(String(all[0].$match.ownerUserId)).toBe(OWNER);
			expect(all[0].$match).not.toHaveProperty('channel');
			expect(all[1].$group.total).toEqual({ $sum: '$unreadCount' });

			const [one] = model.aggregate.mock.calls[1];
			expect(one[0].$match.channel).toBe('INSTAGRAM');
		});

		it('is zero when there is no conversation', async () => {
			const { service, model } = build();
			model.aggregate.mockResolvedValue([]);

			await expect(service.countUnread(OWNER)).resolves.toBe(0);
		});
	});
});
