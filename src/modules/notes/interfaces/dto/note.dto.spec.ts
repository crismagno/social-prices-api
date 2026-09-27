import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import CreateNoteDto from './createNote.dto';
import UpdateNoteStatusDto from './updateNoteStatus.dto';

const valid: any = {
	title: 'Call supplier',
	text: 'Ask about the delayed shipment',
	date: '2026-10-01T14:30:00.000Z',
	status: 'PENDING',
};

const errorsOf = async (overrides: any = {}) =>
	validate(plainToInstance(CreateNoteDto, { ...valid, ...overrides }));

describe('CreateNoteDto', () => {
	it('accepts the minimum valid body', async () => {
		expect(await errorsOf()).toHaveLength(0);
	});

	it('accepts the optional id arrays', async () => {
		expect(
			await errorsOf({
				tagsIds: ['a'],
				categoriesIds: ['b'],
				customerIds: ['c'],
				saleIds: ['d'],
				storeIds: ['e'],
			}),
		).toHaveLength(0);
	});

	it.each([
		['empty title', { title: '' }],
		['title over 200', { title: 'a'.repeat(201) }],
		['empty text', { text: '' }],
		['text over 4000', { text: 'a'.repeat(4001) }],
		['missing date', { date: undefined }],
		['bad date', { date: 'not a date' }],
		['unknown status', { status: 'DONE' }],
	])('rejects %s', async (_label, overrides) => {
		expect(await errorsOf(overrides)).not.toHaveLength(0);
	});
});

describe('UpdateNoteStatusDto', () => {
	it('accepts a known status', async () => {
		expect(
			await validate(
				plainToInstance(UpdateNoteStatusDto, { status: 'COMPLETED' }),
			),
		).toHaveLength(0);
	});

	it('rejects an unknown status', async () => {
		expect(
			await validate(plainToInstance(UpdateNoteStatusDto, { status: 'DONE' })),
		).not.toHaveLength(0);
	});
});
