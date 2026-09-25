import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import UpdateUserLimitsDto from './updateUserLimits.dto';

const errorsFor = async (features: any) =>
	validate(plainToInstance(UpdateUserLimitsDto, { features }));

describe('UpdateUserLimitsDto', () => {
	it('accepts zero and positive integers', async () => {
		expect(await errorsFor({ products: 0, tags: 10 })).toHaveLength(0);
	});

	it('rejects a negative limit', async () => {
		expect(await errorsFor({ products: -1 })).not.toHaveLength(0);
	});

	it('rejects a non-integer limit', async () => {
		expect(await errorsFor({ stores: 1.5 })).not.toHaveLength(0);
	});
});
