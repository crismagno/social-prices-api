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

	it('saveOutgoing stores what was sent from this system, as OUT, with who sent it', async () => {
		const { service, model } = build();
		const sentAt = new Date('2030-01-02');

		await service.saveOutgoing(OWNER, {
			psid: 'PSID1',
			mid: 'm9',
			text: 'claro!',
			sentAt,
			sentByEmployeeId: 'e1',
		});

		expect(model.create).toHaveBeenCalledWith({
			ownerUserId: OWNER,
			direction: MessengerEnum.Direction.OUT,
			psid: 'PSID1',
			mid: 'm9',
			text: 'claro!',
			attachments: [],
			sentAt,
			sentByEmployeeId: 'e1',
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
