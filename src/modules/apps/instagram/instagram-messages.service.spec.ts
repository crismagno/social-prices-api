import InstagramEnum from './instagram.enum';
import { InstagramMessagesService } from './instagram-messages.service';

const OWNER = '507f1f77bcf86cd799439011';

const incoming: any = {
	accountId: 'ACCOUNT1',
	igsid: 'IGSID1',
	direction: InstagramEnum.Direction.IN,
	mid: 'm1',
	text: 'oi',
	attachments: [{ type: 'image', url: 'https://cdn.fbsbx.com/a.jpg' }],
	isUnsupported: false,
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
		find: jest.fn().mockReturnValue(chain),
		findOne: jest.fn(),
	};

	return { model, chain, service: new InstagramMessagesService(model) };
};

describe('InstagramMessagesService', () => {
	describe('saveIncoming', () => {
		it('stores a customer message as IN, without the account id it only used to find the owner', async () => {
			const { service, model } = build();

			await expect(service.saveIncoming(OWNER, incoming)).resolves.toBe(true);

			expect(model.create).toHaveBeenCalledWith({
				ownerUserId: OWNER,
				direction: InstagramEnum.Direction.IN,
				igsid: 'IGSID1',
				mid: 'm1',
				text: 'oi',
				attachments: incoming.attachments,
				isUnsupported: false,
				sentAt: incoming.sentAt,
			});
		});

		it('says false for a message that was already stored (a repeated delivery)', async () => {
			const { service, model } = build();
			model.create.mockRejectedValue({ code: 11000 });

			await expect(service.saveIncoming(OWNER, incoming)).resolves.toBe(false);
		});

		it('lets any other failure through, so Instagram delivers again', async () => {
			const { service, model } = build();
			model.create.mockRejectedValue(new Error('db down'));

			await expect(service.saveIncoming(OWNER, incoming)).rejects.toThrow(
				'db down',
			);
		});
	});

	describe('saveOutgoing', () => {
		it('stores a reply sent from here, as OUT, with who sent it', async () => {
			const { service, model } = build();
			const sentAt = new Date('2030-01-02');

			await service.saveOutgoing(OWNER, {
				igsid: 'IGSID1',
				mid: 'm9',
				text: 'claro!',
				sentAt,
				sentByEmployeeId: 'e1',
			});

			const [filter, update, options] = model.findOneAndUpdate.mock.calls[0];

			expect(filter).toEqual({ ownerUserId: OWNER, mid: 'm9' });
			expect(update.$setOnInsert).toEqual({
				direction: InstagramEnum.Direction.OUT,
				igsid: 'IGSID1',
				text: 'claro!',
				attachments: [],
				sentAt,
			});
			// If Instagram's echo of this very message got here first, only who sent it is added.
			expect(update.$set).toEqual({ sentByEmployeeId: 'e1' });
			expect(options).toMatchObject({ upsert: true, new: true });
		});
	});

	describe('saveEcho', () => {
		const echo: any = {
			...incoming,
			direction: InstagramEnum.Direction.OUT,
			mid: 'e1',
			text: 'pelo app do Instagram',
			attachments: [],
		};

		it('stores a message the account sent outside this system, as OUT, with no employee', async () => {
			const { service, model } = build();

			await expect(service.saveEcho(OWNER, echo)).resolves.toBe(true);

			expect(model.create).toHaveBeenCalledWith({
				ownerUserId: OWNER,
				direction: InstagramEnum.Direction.OUT,
				igsid: 'IGSID1',
				mid: 'e1',
				text: 'pelo app do Instagram',
				attachments: [],
				isUnsupported: false,
				sentAt: incoming.sentAt,
			});
		});

		it('says false when this message is already stored, such as the echo of one sent from here', async () => {
			const { service, model } = build();
			model.create.mockRejectedValue({ code: 11000 });

			await expect(service.saveEcho(OWNER, echo)).resolves.toBe(false);
		});

		it('lets any other failure through, so Instagram delivers again', async () => {
			const { service, model } = build();
			model.create.mockRejectedValue(new Error('db down'));

			await expect(service.saveEcho(OWNER, echo)).rejects.toThrow('db down');
		});
	});

	describe('listByChat', () => {
		it('returns one conversation, newest first, for that owner only', async () => {
			const { service, model, chain } = build();

			await service.listByChat(OWNER, 'IGSID1', { limit: 20, before: 'abc' });

			expect(model.find).toHaveBeenCalledWith({
				ownerUserId: OWNER,
				igsid: 'IGSID1',
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

			await service.listByChat(OWNER, 'IGSID1', { limit });

			expect(chain.limit).toHaveBeenCalledWith(expected);
		});
	});

	it('findOwned finds one message of that owner chat', async () => {
		const { service, model } = build();
		model.findOne.mockReturnValue({
			lean: jest.fn().mockResolvedValue({ _id: 'm1' }),
		});

		await service.findOwned(OWNER, 'IGSID1', 'm1');

		expect(model.findOne).toHaveBeenCalledWith({
			_id: 'm1',
			ownerUserId: OWNER,
			igsid: 'IGSID1',
		});
	});
});
