import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import CreateTransactionDto from './createTransaction.dto';

const valid: any = {
	name: 'Rent',
	type: 'EXPENSE',
	value: 1200.5,
	status: 'PENDING',
};

const errorsOf = async (overrides: any = {}) =>
	validate(plainToInstance(CreateTransactionDto, { ...valid, ...overrides }));

describe('CreateTransactionDto', () => {
	it('accepts the minimum valid body', async () => {
		expect(await errorsOf()).toHaveLength(0);
	});

	it('accepts the optional fields', async () => {
		expect(
			await errorsOf({
				note: 'n',
				tagsIds: ['a'],
				categoriesIds: ['b'],
				storeIds: ['c'],
				createdDate: '2026-09-01T10:00:00.000Z',
			}),
		).toHaveLength(0);
		expect(await errorsOf({ createdDate: null })).toHaveLength(0);
	});

	it.each([
		['empty name', { name: '' }],
		['name over 200', { name: 'a'.repeat(201) }],
		['unknown type', { type: 'OTHER' }],
		['unknown status', { status: 'DONE' }],
		['zero value', { value: 0 }],
		['negative value', { value: -5 }],
		['three decimals', { value: 1.234 }],
		['string value', { value: '10' }],
		['note over 2000', { note: 'a'.repeat(2001) }],
		['bad date', { createdDate: 'yesterday' }],
	])('rejects %s', async (_label, overrides) => {
		expect(await errorsOf(overrides)).not.toHaveLength(0);
	});
});
