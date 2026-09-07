import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';

import { schemasName } from '../../src/infra/database/mongo/schemas';
import { CountersService } from '../../src/modules/counters/counters.service';
import LogsEnum from '../../src/modules/logs/interfaces/logs.enum';
import { LogsService } from '../../src/modules/logs/logs.service';

describe('LogsService', () => {
	let logsService: LogsService;
	let saved: any[];
	let shouldFail: boolean;
	let counter: number;

	beforeEach(async () => {
		saved = [];
		shouldFail = false;
		counter = 0;

		// Mongoose models are used as constructors, so the double is a class.
		const logModel = class {
			private readonly _doc: any;

			constructor(doc: any) {
				this._doc = doc;
			}

			async save() {
				if (shouldFail) {
					throw new Error('mongo is down');
				}

				saved.push(this._doc);

				return this._doc;
			}
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				LogsService,
				{ provide: getModelToken(schemasName.log), useValue: logModel },
				{
					provide: CountersService,
					useValue: {
						findNextNumberByType: jest
							.fn()
							.mockImplementation(async () => ++counter),
					},
				},
			],
		}).compile();

		logsService = module.get<LogsService>(LogsService);
	});

	it.each([
		['error', LogsEnum.Type.ERROR],
		['info', LogsEnum.Type.INFO],
		['warning', LogsEnum.Type.WARNING],
		['success', LogsEnum.Type.SUCCESS],
	])('%s() persists a log with type %s', async (method: string, type) => {
		await (logsService as any)[method]('a message', { key: 'value' });

		expect(saved).toHaveLength(1);
		expect(saved[0]).toEqual(
			expect.objectContaining({
				message: 'a message',
				data: { key: 'value' },
				type,
			}),
		);
	});

	it('sets createdAt on write', async () => {
		await logsService.info('a message');

		expect(saved[0].createdAt).toBeInstanceOf(Date);
	});

	it('defaults data to null when it is not given', async () => {
		await logsService.info('a message');

		expect(saved[0].data).toBeNull();
	});

	it('never throws when the model rejects', async () => {
		shouldFail = true;

		await expect(logsService.error('boom')).resolves.toBeUndefined();
		expect(saved).toHaveLength(0);
	});

	it('stamps each log with a number from the counter', async () => {
		await logsService.info('first');
		await logsService.info('second');

		expect(saved[0].number).toBe(1);
		expect(saved[1].number).toBe(2);
	});

	it('never throws when the counter fails', async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				LogsService,
				{ provide: getModelToken(schemasName.log), useValue: class {} },
				{
					provide: CountersService,
					useValue: {
						findNextNumberByType: jest
							.fn()
							.mockRejectedValue(new Error('counter is down')),
					},
				},
			],
		}).compile();

		const service = module.get<LogsService>(LogsService);

		await expect(service.error('boom')).resolves.toBeUndefined();
	});
});
