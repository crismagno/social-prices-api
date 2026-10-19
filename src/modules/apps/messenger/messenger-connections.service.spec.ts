import AppsEnum from '../interfaces/apps.enum';
import { MessengerConnectionsService } from './messenger-connections.service';

const OWNER = '507f1f77bcf86cd799439011';

const build = () => {
	const model: any = {
		findOne: jest.fn(),
		findOneAndUpdate: jest.fn().mockResolvedValue({ _id: 'c1' }),
		updateOne: jest.fn().mockResolvedValue({}),
		deleteOne: jest.fn().mockResolvedValue({}),
	};
	const cipher: any = {
		encrypt: jest.fn().mockImplementation((v) => `ENC(${JSON.stringify(v)})`),
		decrypt: jest.fn().mockReturnValue({ pageToken: 'PAGE_TOKEN' }),
	};

	return {
		model,
		cipher,
		service: new MessengerConnectionsService(model, cipher),
	};
};

describe('MessengerConnectionsService', () => {
	it('saveConnected keeps the Page token encrypted and clears what was left to choose', async () => {
		const { service, model, cipher } = build();

		await service.saveConnected(OWNER, {
			id: '123',
			name: 'Loja',
			accessToken: 'PAGE_TOKEN',
		});

		const [filter, update, options] = model.findOneAndUpdate.mock.calls[0];

		expect(filter).toEqual({ ownerUserId: OWNER });
		expect(cipher.encrypt).toHaveBeenCalledWith({ pageToken: 'PAGE_TOKEN' });
		expect(update.$set).toMatchObject({
			status: AppsEnum.ConnectionStatus.CONNECTED,
			pageId: '123',
			pageName: 'Loja',
			token: expect.stringContaining('ENC('),
			connectedAt: expect.any(Date),
			lastUpdateAt: null,
		});
		expect(JSON.stringify(update)).not.toContain('"PAGE_TOKEN"');
		expect(update.$unset).toEqual({ pendingPages: '', pendingExpiresAt: '' });
		expect(options).toMatchObject({ upsert: true });
	});

	it('savePending keeps the choices, each token encrypted, for a short while', async () => {
		const { service, model } = build();

		await service.savePending(OWNER, [
			{ id: '1', name: 'A', accessToken: 'T1' },
			{ id: '2', name: 'B', accessToken: 'T2' },
		]);

		const [filter, update, options] = model.updateOne.mock.calls[0];

		expect(filter).toEqual({ ownerUserId: OWNER });
		expect(update.$set.pendingPages).toEqual([
			{ pageId: '1', pageName: 'A', token: expect.stringContaining('ENC(') },
			{ pageId: '2', pageName: 'B', token: expect.stringContaining('ENC(') },
		]);
		expect(update.$set.pendingExpiresAt.getTime()).toBeGreaterThan(Date.now());
		expect(JSON.stringify(update)).not.toMatch(/"T1"|"T2"/);
		expect(options).toMatchObject({ upsert: true });
	});

	it('findPending returns the decrypted page the user picked, while the list is fresh', async () => {
		const { service, model } = build();
		model.findOne.mockReturnValue({
			select: jest.fn().mockResolvedValue({
				pendingExpiresAt: new Date(Date.now() + 60_000),
				pendingPages: [{ pageId: '2', pageName: 'B', token: 'ENC' }],
			}),
		});

		await expect(service.findPending(OWNER, '2')).resolves.toEqual({
			id: '2',
			name: 'B',
			accessToken: 'PAGE_TOKEN',
		});
	});

	it.each([
		[
			'the list timed out',
			{
				pendingExpiresAt: new Date(Date.now() - 1),
				pendingPages: [{ pageId: '2', pageName: 'B', token: 'E' }],
			},
		],
		[
			'the page is not on it',
			{
				pendingExpiresAt: new Date(Date.now() + 60_000),
				pendingPages: [{ pageId: '9', pageName: 'X', token: 'E' }],
			},
		],
		['there is nothing pending', null],
	])('findPending is null when %s', async (_why, doc) => {
		const { service, model } = build();
		model.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(doc) });

		await expect(service.findPending(OWNER, '2')).resolves.toBeNull();
	});

	it('listPending shows the names only, never a token', async () => {
		const { service, model } = build();
		model.findOne.mockReturnValue({
			select: jest.fn().mockResolvedValue({
				pendingExpiresAt: new Date(Date.now() + 60_000),
				pendingPages: [{ pageId: '1', pageName: 'A', token: 'ENC' }],
			}),
		});

		const pages = await service.listPending(OWNER);

		expect(pages).toEqual([{ pageId: '1', pageName: 'A' }]);
	});

	it('getStatus says connected only when a Page was chosen', async () => {
		const { service, model } = build();

		model.findOne.mockResolvedValue({
			status: AppsEnum.ConnectionStatus.CONNECTED,
			pageId: '1',
			pageName: 'Loja',
		});
		await expect(service.getStatus(OWNER)).resolves.toEqual({
			connected: true,
			status: AppsEnum.ConnectionStatus.CONNECTED,
			accountLabel: 'Loja',
		});

		model.findOne.mockResolvedValue({ pendingExpiresAt: new Date() });
		await expect(service.getStatus(OWNER)).resolves.toEqual({
			connected: false,
			status: null,
			accountLabel: null,
		});
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

	it('deleteByOwner removes only that owner connection', async () => {
		const { service, model } = build();

		await service.deleteByOwner(OWNER);

		expect(model.deleteOne).toHaveBeenCalledWith({ ownerUserId: OWNER });
	});
});
