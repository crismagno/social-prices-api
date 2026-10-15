import AppsEnum from '../interfaces/apps.enum';
import { AppConnectionsService } from './app-connections.service';

const OWNER = '507f1f77bcf86cd799439011';

const build = () => {
	const model: any = {
		find: jest.fn().mockResolvedValue([]),
		findOne: jest.fn(),
		findOneAndUpdate: jest.fn().mockResolvedValue({ _id: 'c1' }),
		updateOne: jest.fn().mockResolvedValue({}),
		deleteOne: jest.fn().mockResolvedValue({}),
	};
	const vault: any = {
		encrypt: jest.fn().mockReturnValue('ENCRYPTED'),
		decrypt: jest.fn().mockReturnValue({ accessToken: 'a', refreshToken: 'r' }),
	};

	return { model, vault, service: new AppConnectionsService(model, vault) };
};

describe('AppConnectionsService', () => {
	it('upsert stores only the encrypted blob', async () => {
		const { service, model } = build();

		await service.upsert({
			ownerUserId: OWNER,
			appId: AppsEnum.App.GOOGLE_CONTACTS,
			accountLabel: 'me@example.com',
			credentials: {
				accessToken: 'plain-access',
				refreshToken: 'plain-refresh',
			},
			scopes: ['s1'],
			expiresAt: new Date('2030-01-01'),
		});

		const [filter, update, options] = model.findOneAndUpdate.mock.calls[0];

		expect(filter).toEqual({
			ownerUserId: OWNER,
			appId: AppsEnum.App.GOOGLE_CONTACTS,
		});
		expect(update.$set.credentials).toBe('ENCRYPTED');
		expect(update.$set.status).toBe(AppsEnum.ConnectionStatus.CONNECTED);
		expect(JSON.stringify(update)).not.toContain('plain-access');
		expect(JSON.stringify(update)).not.toContain('plain-refresh');
		expect(options).toMatchObject({ upsert: true, new: true });
	});

	it('findWithCredentials explicitly selects the hidden credentials field', async () => {
		const { service, model } = build();
		const select = jest.fn().mockResolvedValue({ _id: 'c1' });
		model.findOne.mockReturnValue({ select });

		await service.findWithCredentials(OWNER, AppsEnum.App.GOOGLE_CONTACTS);

		expect(select).toHaveBeenCalledWith('+credentials');
	});

	it('updateTokens re-encrypts and marks the connection CONNECTED', async () => {
		const { service, model } = build();

		await service.updateTokens(
			'c1',
			{ accessToken: 'new' },
			new Date('2030-01-01'),
		);

		const [, update] = model.updateOne.mock.calls[0];

		expect(update.$set.credentials).toBe('ENCRYPTED');
		expect(update.$set.status).toBe(AppsEnum.ConnectionStatus.CONNECTED);
	});

	it('saveSyncResult stores the summary', async () => {
		const { service, model } = build();
		const summary: any = { created: 1, finishedAt: new Date('2030-01-02') };

		await service.saveSyncResult('c1', summary);

		const [, update] = model.updateOne.mock.calls[0];

		expect(update.$set).toMatchObject({
			lastSyncAt: summary.finishedAt,
			lastSyncSummary: summary,
		});
	});

	it('deleteByOwnerAndApp deletes by owner + app', async () => {
		const { service, model } = build();

		await service.deleteByOwnerAndApp(OWNER, AppsEnum.App.GOOGLE_CONTACTS);

		expect(model.deleteOne).toHaveBeenCalledWith({
			ownerUserId: OWNER,
			appId: AppsEnum.App.GOOGLE_CONTACTS,
		});
	});
});
