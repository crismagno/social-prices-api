import AppsEnum from '../interfaces/apps.enum';
import { GoogleContactsConnectionsService } from './google-contacts-connections.service';

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
		decrypt: jest.fn().mockReturnValue({ accessToken: 'a', refreshToken: 'r' }),
	};

	return {
		model,
		cipher,
		service: new GoogleContactsConnectionsService(model, cipher),
	};
};

describe('GoogleContactsConnectionsService', () => {
	it('saveConnection keeps only the encrypted tokens, one connection per owner', async () => {
		const { service, model } = build();

		await service.saveConnection({
			ownerUserId: OWNER,
			googleEmail: 'me@example.com',
			tokens: { accessToken: 'plain-access', refreshToken: 'plain-refresh' },
			grantedScopes: ['s1'],
			accessTokenExpiresAt: new Date('2030-01-01'),
		});

		const [filter, update, options] = model.findOneAndUpdate.mock.calls[0];

		expect(filter).toEqual({ ownerUserId: OWNER });
		expect(update.$set.tokens).toBe('ENCRYPTED');
		expect(update.$set).toMatchObject({
			status: AppsEnum.ConnectionStatus.CONNECTED,
			googleEmail: 'me@example.com',
			grantedScopes: ['s1'],
			accessTokenExpiresAt: new Date('2030-01-01'),
		});
		expect(JSON.stringify(update)).not.toContain('plain-access');
		expect(JSON.stringify(update)).not.toContain('plain-refresh');
		expect(options).toMatchObject({ upsert: true, new: true });
	});

	it('findByOwner leaves the tokens out', async () => {
		const { service, model } = build();
		model.findOne.mockResolvedValue({ _id: 'c1' });

		await service.findByOwner(OWNER);

		expect(model.findOne).toHaveBeenCalledWith({ ownerUserId: OWNER });
	});

	it('findWithTokens explicitly selects the hidden tokens field', async () => {
		const { service, model } = build();
		const select = jest.fn().mockResolvedValue({ _id: 'c1' });
		model.findOne.mockReturnValue({ select });

		await service.findWithTokens(OWNER);

		expect(select).toHaveBeenCalledWith('+tokens');
	});

	it('readTokens decrypts what was stored', () => {
		const { service, cipher } = build();

		expect(service.readTokens({ tokens: 'ENCRYPTED' } as any)).toEqual({
			accessToken: 'a',
			refreshToken: 'r',
		});
		expect(cipher.decrypt).toHaveBeenCalledWith('ENCRYPTED');
	});

	it('updateAccessToken re-encrypts and marks the connection CONNECTED', async () => {
		const { service, model } = build();

		await service.updateAccessToken(
			'c1',
			{ accessToken: 'new', refreshToken: 'r' },
			new Date('2030-01-01'),
		);

		const [, update] = model.updateOne.mock.calls[0];

		expect(update.$set).toMatchObject({
			tokens: 'ENCRYPTED',
			accessTokenExpiresAt: new Date('2030-01-01'),
			status: AppsEnum.ConnectionStatus.CONNECTED,
		});
	});

	it('saveImportResult stores when and what was imported', async () => {
		const { service, model } = build();
		const result: any = { created: 1, finishedAt: new Date('2030-01-02') };

		await service.saveImportResult('c1', result);

		const [, update] = model.updateOne.mock.calls[0];

		expect(update.$set).toMatchObject({
			lastImportAt: result.finishedAt,
			lastImport: result,
		});
	});

	it('markStatus changes only the status', async () => {
		const { service, model } = build();

		await service.markStatus('c1', AppsEnum.ConnectionStatus.EXPIRED);

		expect(model.updateOne).toHaveBeenCalledWith(
			{ _id: 'c1' },
			{ $set: { status: AppsEnum.ConnectionStatus.EXPIRED } },
		);
	});

	it('deleteByOwner deletes by owner', async () => {
		const { service, model } = build();

		await service.deleteByOwner(OWNER);

		expect(model.deleteOne).toHaveBeenCalledWith({ ownerUserId: OWNER });
	});

	it('getStatus tells the catalog whether Google Contacts is connected', async () => {
		const { service, model } = build();
		model.findOne.mockResolvedValue({
			status: AppsEnum.ConnectionStatus.CONNECTED,
			googleEmail: 'me@example.com',
		});

		await expect(service.getStatus(OWNER)).resolves.toEqual({
			connected: true,
			status: AppsEnum.ConnectionStatus.CONNECTED,
			accountLabel: 'me@example.com',
		});

		model.findOne.mockResolvedValue(null);

		await expect(service.getStatus(OWNER)).resolves.toEqual({
			connected: false,
			status: null,
			accountLabel: null,
		});
	});
});
