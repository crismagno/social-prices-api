import MessengerEnum from './messenger.enum';
import { MessengerMessagesService } from './messenger-messages.service';

const OWNER = '507f1f77bcf86cd799439011';

const incoming: any = {
	pageId: 'PAGE1',
	psid: 'PSID1',
	mid: 'm1',
	text: 'oi',
	attachments: [{ type: 'image', url: 'https://cdn.fbsbx.com/a.jpg' }],
	sentAt: new Date('2030-01-01'),
};

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
		find: jest.fn().mockReturnValue(chain),
		findOne: jest.fn(),
		deleteOne: jest.fn(),
	};

	return { model, chain, service: new MessengerMessagesService(model) };
};

describe('MessengerMessagesService', () => {
	describe('saveIncoming', () => {
		it('stores a customer message as IN, without the page id it only used to find the owner', async () => {
			const { service, model } = build();

			await expect(service.saveIncoming(OWNER, incoming)).resolves.toBe(true);

			expect(model.create).toHaveBeenCalledWith({
				ownerUserId: OWNER,
				direction: MessengerEnum.Direction.IN,
				psid: 'PSID1',
				mid: 'm1',
				text: 'oi',
				attachments: incoming.attachments,
				sentAt: incoming.sentAt,
			});
		});

		it('says false for a message that was already stored (a repeated delivery)', async () => {
			const { service, model } = build();
			model.create.mockRejectedValue({ code: 11000 });

			await expect(service.saveIncoming(OWNER, incoming)).resolves.toBe(false);
		});

		it('lets any other failure through, so Facebook delivers it again', async () => {
			const { service, model } = build();
			model.create.mockRejectedValue(new Error('db down'));

			await expect(service.saveIncoming(OWNER, incoming)).rejects.toThrow(
				'db down',
			);
		});
	});

	describe('saveOutgoing', () => {
		it('stores what was sent from this system, as OUT, with who sent it', async () => {
			const { service, model } = build();
			const sentAt = new Date('2030-01-02');

			await service.saveOutgoing(OWNER, {
				psid: 'PSID1',
				mid: 'm9',
				text: 'claro!',
				sentAt,
				sentByEmployeeId: 'e1',
			});

			const [filter, update, options] = model.findOneAndUpdate.mock.calls[0];

			expect(filter).toEqual({ ownerUserId: OWNER, mid: 'm9' });
			expect(update.$setOnInsert).toEqual({
				direction: MessengerEnum.Direction.OUT,
				psid: 'PSID1',
				text: 'claro!',
				attachments: [],
				sentAt,
			});
			// If Facebook's echo of this very message got here first, only who sent it is added.
			expect(update.$set).toEqual({ sentByEmployeeId: 'e1' });
			expect(options).toMatchObject({ upsert: true, new: true });
		});
	});

	describe('saveOutgoing with a file', () => {
		it('keeps what is known of the file until its echo brings the address', async () => {
			const { service, model } = build();

			await service.saveOutgoing(OWNER, {
				psid: 'PSID1',
				mid: 'm9',
				text: null,
				localAttachment: {
					type: 'file',
					fileName: 'orcamento.pdf',
					size: 2048,
				},
				sentAt: new Date('2030-01-02'),
				sentByEmployeeId: null,
			});

			expect(
				model.findOneAndUpdate.mock.calls[0][1].$setOnInsert,
			).toMatchObject({
				text: null,
				localAttachment: {
					type: 'file',
					fileName: 'orcamento.pdf',
					size: 2048,
				},
			});
		});
	});

	describe('saveEcho', () => {
		const echo: any = {
			pageId: 'PAGE1',
			psid: 'PSID1',
			direction: MessengerEnum.Direction.OUT,
			mid: 'e1',
			text: 'pelo Business Suite',
			attachments: [],
			sentAt: new Date('2030-01-03'),
		};

		it('stores a message the Page sent outside this system, as OUT, with no employee', async () => {
			const { service, model } = build();

			await expect(service.saveEcho(OWNER, echo)).resolves.toBe(true);

			expect(model.create).toHaveBeenCalledWith({
				ownerUserId: OWNER,
				direction: MessengerEnum.Direction.OUT,
				psid: 'PSID1',
				mid: 'e1',
				text: 'pelo Business Suite',
				attachments: [],
				sentAt: echo.sentAt,
			});
		});

		it('says false when this message is already stored, such as the echo of one sent from here', async () => {
			const { service, model } = build();
			model.create.mockRejectedValue({ code: 11000 });

			await expect(service.saveEcho(OWNER, echo)).resolves.toBe(false);
		});

		it('gives the file its address when the message sent from here was stored without one', async () => {
			const { service, model } = build();
			model.create.mockRejectedValue({ code: 11000 });
			const attachments = [
				{ type: 'image', url: 'https://cdn.fbsbx.com/a.jpg' },
			];

			await service.saveEcho(OWNER, { ...echo, attachments });

			expect(model.updateOne).toHaveBeenCalledWith(
				{ ownerUserId: OWNER, mid: 'e1', attachments: { $size: 0 } },
				{ $set: { attachments }, $unset: { localAttachment: '' } },
			);
		});

		it('leaves a stored message alone when its echo carries no file', async () => {
			const { service, model } = build();
			model.create.mockRejectedValue({ code: 11000 });

			await service.saveEcho(OWNER, echo);

			expect(model.updateOne).not.toHaveBeenCalled();
		});

		it('lets any other failure through, so Facebook delivers again', async () => {
			const { service, model } = build();
			model.create.mockRejectedValue(new Error('db down'));

			await expect(service.saveEcho(OWNER, echo)).rejects.toThrow('db down');
		});
	});

	describe('listByChat', () => {
		it('returns one conversation, newest first, for that owner only', async () => {
			const { service, model, chain } = build();

			await service.listByChat(OWNER, 'PSID1', { limit: 20, before: 'abc' });

			expect(model.find).toHaveBeenCalledWith({
				ownerUserId: OWNER,
				psid: 'PSID1',
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

			await service.listByChat(OWNER, 'PSID1', { limit });

			expect(chain.limit).toHaveBeenCalledWith(expected);
		});
	});

	it('findOwned finds one message of that owner chat', async () => {
		const { service, model } = build();
		model.findOne.mockReturnValue({
			lean: jest.fn().mockResolvedValue({ _id: 'm1' }),
		});

		await service.findOwned(OWNER, 'PSID1', 'm1');

		expect(model.findOne).toHaveBeenCalledWith({
			_id: 'm1',
			ownerUserId: OWNER,
			psid: 'PSID1',
		});
	});
});
