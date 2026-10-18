import AppsEnum from '../interfaces/apps.enum';
import { TelegramConnectionsService } from './telegram-connections.service';

const OWNER = '507f1f77bcf86cd799439011';

const build = () => {
	const model: any = {
		findOne: jest.fn(),
		findOneAndUpdate: jest.fn().mockResolvedValue({ _id: 'c1' }),
		updateOne: jest.fn().mockResolvedValue({}),
		deleteOne: jest.fn().mockResolvedValue({}),
	};
	const cipher: any = {
		encrypt: jest.fn().mockReturnValue('ENCRYPTED'),
		decrypt: jest.fn().mockReturnValue({ botToken: '123:AAA' }),
	};

	return {
		model,
		cipher,
		service: new TelegramConnectionsService(model, cipher),
	};
};

describe('TelegramConnectionsService', () => {
	it('saveConnection keeps the token encrypted and only a hash of the webhook secret', async () => {
		const { service, model } = build();

		await service.saveConnection({
			ownerUserId: OWNER,
			bot: { id: 123, username: 'loja_bot', firstName: 'Loja' },
			botToken: '123:plain-token',
			webhookKey: 'key-1',
			webhookSecretHash: 'hash-1',
		});

		const [filter, update, options] = model.findOneAndUpdate.mock.calls[0];

		expect(filter).toEqual({ ownerUserId: OWNER });
		expect(update.$set).toMatchObject({
			status: AppsEnum.ConnectionStatus.CONNECTED,
			botId: 123,
			botUsername: 'loja_bot',
			botName: 'Loja',
			token: 'ENCRYPTED',
			webhookKey: 'key-1',
			webhookSecretHash: 'hash-1',
			webhookRegisteredAt: expect.any(Date),
		});
		expect(JSON.stringify(update)).not.toContain('plain-token');
		expect(options).toMatchObject({ upsert: true, new: true });
	});

	it('findByOwner and findByBotId leave the secrets out', async () => {
		const { service, model } = build();
		model.findOne.mockResolvedValue({ _id: 'c1' });

		await service.findByOwner(OWNER);
		await service.findByBotId(123);

		expect(model.findOne).toHaveBeenNthCalledWith(1, { ownerUserId: OWNER });
		expect(model.findOne).toHaveBeenNthCalledWith(2, { botId: 123 });
	});

	it('findWithToken explicitly selects the hidden token', async () => {
		const { service, model } = build();
		const select = jest.fn().mockResolvedValue({ _id: 'c1' });
		model.findOne.mockReturnValue({ select });

		await service.findWithToken(OWNER);

		expect(select).toHaveBeenCalledWith('+token');
	});

	it('findByWebhookKey selects the hash needed to check the secret', async () => {
		const { service, model } = build();
		const select = jest.fn().mockResolvedValue({ _id: 'c1' });
		model.findOne.mockReturnValue({ select });

		await service.findByWebhookKey('key-1');

		expect(model.findOne).toHaveBeenCalledWith({ webhookKey: 'key-1' });
		expect(select).toHaveBeenCalledWith('+webhookSecretHash');
	});

	it('readToken decrypts the stored token', () => {
		const { service, cipher } = build();

		expect(service.readToken({ token: 'ENCRYPTED' } as any)).toBe('123:AAA');
		expect(cipher.decrypt).toHaveBeenCalledWith('ENCRYPTED');
	});

	it('updateWebhook swaps the key and the secret hash, nothing else', async () => {
		const { service, model } = build();

		await service.updateWebhook('c1', {
			webhookKey: 'key-2',
			webhookSecretHash: 'hash-2',
		});

		expect(model.updateOne).toHaveBeenCalledWith(
			{ _id: 'c1' },
			{
				$set: {
					webhookKey: 'key-2',
					webhookSecretHash: 'hash-2',
					webhookRegisteredAt: expect.any(Date),
				},
			},
		);
	});

	it('touchLastUpdate records when the last message arrived', async () => {
		const { service, model } = build();
		const at = new Date('2030-01-01');

		await service.touchLastUpdate('c1', at);

		expect(model.updateOne).toHaveBeenCalledWith(
			{ _id: 'c1' },
			{ $set: { lastUpdateAt: at } },
		);
	});

	it('deleteByOwner deletes by owner', async () => {
		const { service, model } = build();

		await service.deleteByOwner(OWNER);

		expect(model.deleteOne).toHaveBeenCalledWith({ ownerUserId: OWNER });
	});

	it('getStatus tells the catalog whether the bot is connected', async () => {
		const { service, model } = build();
		model.findOne.mockResolvedValue({
			status: AppsEnum.ConnectionStatus.CONNECTED,
			botUsername: 'loja_bot',
		});

		await expect(service.getStatus(OWNER)).resolves.toEqual({
			connected: true,
			status: AppsEnum.ConnectionStatus.CONNECTED,
			accountLabel: '@loja_bot',
		});

		model.findOne.mockResolvedValue(null);

		await expect(service.getStatus(OWNER)).resolves.toEqual({
			connected: false,
			status: null,
			accountLabel: null,
		});
	});
});
