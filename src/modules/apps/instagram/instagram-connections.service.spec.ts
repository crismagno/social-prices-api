import AppsEnum from '../interfaces/apps.enum';
import { InstagramConnectionsService } from './instagram-connections.service';

const OWNER = '507f1f77bcf86cd799439011';
const ACCOUNT = {
	userId: '1789',
	username: 'loja_ana',
	name: 'Loja da Ana',
	profilePictureUrl: 'https://x/p.jpg',
	accountType: 'BUSINESS',
};
const DAY = 86_400_000;

const build = () => {
	const model: any = {
		findOne: jest.fn(),
		findOneAndUpdate: jest.fn().mockResolvedValue({ _id: 'c1' }),
		updateOne: jest.fn().mockResolvedValue({}),
		deleteOne: jest.fn().mockResolvedValue({}),
	};
	const cipher: any = {
		encrypt: jest.fn().mockImplementation((v) => `ENC(${JSON.stringify(v)})`),
		decrypt: jest.fn().mockReturnValue({ accessToken: 'TOKEN' }),
	};

	return {
		model,
		cipher,
		service: new InstagramConnectionsService(model, cipher),
	};
};

describe('InstagramConnectionsService', () => {
	it('saveConnected keeps the token encrypted and when it stops working', async () => {
		const { service, model, cipher } = build();
		const expiresAt = new Date(Date.now() + 60 * DAY);

		await service.saveConnected(OWNER, ACCOUNT, {
			accessToken: 'TOKEN',
			expiresAt,
		});

		const [filter, update, options] = model.findOneAndUpdate.mock.calls[0];

		expect(filter).toEqual({ ownerUserId: OWNER });
		expect(cipher.encrypt).toHaveBeenCalledWith({ accessToken: 'TOKEN' });
		expect(update.$set).toMatchObject({
			status: AppsEnum.ConnectionStatus.CONNECTED,
			instagramUserId: '1789',
			username: 'loja_ana',
			name: 'Loja da Ana',
			profilePictureUrl: 'https://x/p.jpg',
			token: expect.stringContaining('ENC('),
			tokenExpiresAt: expiresAt,
			connectedAt: expect.any(Date),
			lastUpdateAt: null,
		});
		expect(JSON.stringify(update)).not.toContain('"TOKEN"');
		expect(options).toMatchObject({ upsert: true });
	});

	it('readToken decrypts the token', () => {
		const { service } = build();

		expect(service.readToken({ token: 'ENC' } as any)).toBe('TOKEN');
	});

	it('updateToken stores a renewed token with its new expiry', async () => {
		const { service, model } = build();
		const expiresAt = new Date(Date.now() + 60 * DAY);

		await service.updateToken('c1', { accessToken: 'NEW', expiresAt });

		expect(model.updateOne).toHaveBeenCalledWith(
			{ _id: 'c1' },
			{
				$set: {
					token: expect.stringContaining('ENC('),
					tokenExpiresAt: expiresAt,
					status: AppsEnum.ConnectionStatus.CONNECTED,
				},
			},
		);
	});

	it('markExpired says the user has to connect again', async () => {
		const { service, model } = build();

		await service.markExpired('c1');

		expect(model.updateOne).toHaveBeenCalledWith(
			{ _id: 'c1' },
			{ $set: { status: AppsEnum.ConnectionStatus.EXPIRED } },
		);
	});

	describe('getStatus', () => {
		const status = (over: any) => {
			const { service, model } = build();
			model.findOne.mockResolvedValue({
				status: AppsEnum.ConnectionStatus.CONNECTED,
				username: 'loja_ana',
				tokenExpiresAt: new Date(Date.now() + 30 * DAY),
				...over,
			});

			return service.getStatus(OWNER);
		};

		it('is connected, labelled with the @username', async () => {
			await expect(status({})).resolves.toEqual({
				connected: true,
				status: AppsEnum.ConnectionStatus.CONNECTED,
				accountLabel: '@loja_ana',
			});
		});

		it('is expired, not connected, once the token ran out, even if nobody noticed yet', async () => {
			await expect(
				status({ tokenExpiresAt: new Date(Date.now() - 1000) }),
			).resolves.toEqual({
				connected: false,
				status: AppsEnum.ConnectionStatus.EXPIRED,
				accountLabel: '@loja_ana',
			});
		});

		it('is expired when it was marked so', async () => {
			await expect(
				status({ status: AppsEnum.ConnectionStatus.EXPIRED }),
			).resolves.toMatchObject({
				connected: false,
				status: AppsEnum.ConnectionStatus.EXPIRED,
			});
		});

		it('is not connected without any connection', async () => {
			const { service, model } = build();
			model.findOne.mockResolvedValue(null);

			await expect(service.getStatus(OWNER)).resolves.toEqual({
				connected: false,
				status: null,
				accountLabel: null,
			});
		});
	});

	it('isTokenExpired compares with now', () => {
		const { service } = build();

		expect(
			service.isTokenExpired({
				tokenExpiresAt: new Date(Date.now() - 1),
			} as any),
		).toBe(true);
		expect(
			service.isTokenExpired({
				tokenExpiresAt: new Date(Date.now() + DAY),
			} as any),
		).toBe(false);
	});

	it('touchLastUpdate and deleteByOwner', async () => {
		const { service, model } = build();
		const at = new Date('2030-01-01');

		await service.touchLastUpdate('c1', at);
		await service.deleteByOwner(OWNER);

		expect(model.updateOne).toHaveBeenCalledWith(
			{ _id: 'c1' },
			{ $set: { lastUpdateAt: at } },
		);
		expect(model.deleteOne).toHaveBeenCalledWith({ ownerUserId: OWNER });
	});
});
