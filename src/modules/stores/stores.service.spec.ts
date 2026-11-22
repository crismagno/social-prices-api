import { StoresService } from './stores.service';

const USER_ID: string = '507f1f77bcf86cd799439011';
const STORE_ID: string = '507f1f77bcf86cd799439012';

const baseDto = (extra: Record<string, unknown> = {}): any => ({
	name: 'Loja Central',
	email: 'loja@example.com',
	startedAt: new Date('2026-01-01T00:00:00.000Z'),
	addresses: [],
	phoneNumbers: [],
	categoriesIds: [],
	tagsIds: [],
	...extra,
});

describe('StoresService.isVisibleInSearch', () => {
	const build = () => {
		const service: any = Object.create(StoresService.prototype);
		const saved: any[] = [];

		const model: any = jest.fn().mockImplementation((doc: any) => {
			saved.push(doc);

			return { save: jest.fn().mockResolvedValue({ _id: STORE_ID, ...doc }) };
		});

		model.findOneAndUpdate = jest.fn().mockResolvedValue({ _id: STORE_ID });
		model.findById = jest.fn().mockResolvedValue({
			_id: STORE_ID,
			name: 'Loja Central',
			email: 'loja@example.com',
			userId: USER_ID,
			logo: null,
		});

		service._storeModel = model;
		service._featureLimitsService = {
			assertCanCreate: jest.fn().mockResolvedValue(undefined),
		};
		service._usersService = {
			findOneByIdOrFail: jest.fn().mockResolvedValue({ _id: USER_ID }),
		};
		service._notificationsService = {
			createdStore: jest.fn().mockResolvedValue(undefined),
			updatedStore: jest.fn().mockResolvedValue(undefined),
		};
		service._filesService = {};
		service.validateCreate = jest.fn().mockResolvedValue(undefined);
		service.findByIdOrFail = jest.fn().mockResolvedValue({
			_id: STORE_ID,
			name: 'Loja Central',
			email: 'loja@example.com',
			userId: USER_ID,
			logo: null,
		});

		return { service: service as StoresService, model, saved };
	};

	const setOf = (model: any) => model.findOneAndUpdate.mock.calls[0][1].$set;

	it('lists a new store in the search when nothing is said', async () => {
		const { service, saved } = build();

		await service.create(undefined, baseDto(), USER_ID);

		expect(saved[0].isVisibleInSearch).toBe(true);
	});

	it.each([
		[false, false],
		['false', false],
		['true', true],
	])('creates with the switch sent as %p', async (sent, stored) => {
		const { service, saved } = build();

		await service.create(
			undefined,
			baseDto({ isVisibleInSearch: sent }),
			USER_ID,
		);

		expect(saved[0].isVisibleInSearch).toBe(stored);
	});

	it('turns the switch off on update', async () => {
		const { service, model } = build();

		await service.update(
			undefined,
			baseDto({ storeId: STORE_ID, isVisibleInSearch: 'false' }),
		);

		expect(setOf(model).isVisibleInSearch).toBe(false);
	});

	it('leaves the stored switch alone when the update omits it', async () => {
		const { service, model } = build();

		await service.update(undefined, baseDto({ storeId: STORE_ID }));

		expect('isVisibleInSearch' in setOf(model)).toBe(false);
	});

	// A multipart form sends an empty type as the text "null".
	it.each(['null', 'undefined', '', null, undefined])(
		'creates a store with no type when the form sends %p',
		async (sent: unknown) => {
			const { service, saved } = build();

			await service.create(undefined, baseDto({ type: sent }), USER_ID);

			expect(saved[0].type).toBeNull();
		},
	);

	it('keeps the type chosen for the store', async () => {
		const { service, saved, model } = build();

		await service.create(undefined, baseDto({ type: 'ONLINE' }), USER_ID);
		await service.update(
			undefined,
			baseDto({ storeId: STORE_ID, type: 'PHYSICAL' }),
		);

		expect(saved[0].type).toBe('ONLINE');
		expect(setOf(model).type).toBe('PHYSICAL');
	});

	it('clears the type on update when the form sends none', async () => {
		const { service, model } = build();

		await service.update(
			undefined,
			baseDto({ storeId: STORE_ID, type: 'null' }),
		);

		expect(setOf(model).type).toBeNull();
	});
});
