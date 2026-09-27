import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import CreateFeedbackDto from './createFeedback.dto';
import UpdateFeedbackStatusDto from './updateFeedbackStatus.dto';

const errorsOf = async (Cls: any, plain: any) =>
	validate(plainToInstance(Cls, plain));

describe('feedback DTOs', () => {
	it('accepts a normal message', async () => {
		expect(await errorsOf(CreateFeedbackDto, { message: 'nice' })).toHaveLength(
			0,
		);
	});

	it('rejects an empty message', async () => {
		expect(await errorsOf(CreateFeedbackDto, { message: '' })).not.toHaveLength(
			0,
		);
	});

	it('rejects a message over 2000 characters', async () => {
		expect(
			await errorsOf(CreateFeedbackDto, { message: 'a'.repeat(2001) }),
		).not.toHaveLength(0);
		expect(
			await errorsOf(CreateFeedbackDto, { message: 'a'.repeat(2000) }),
		).toHaveLength(0);
	});

	it('accepts only known statuses', async () => {
		expect(
			await errorsOf(UpdateFeedbackStatusDto, { status: 'SEEN' }),
		).toHaveLength(0);
		expect(
			await errorsOf(UpdateFeedbackStatusDto, { status: 'DONE' }),
		).not.toHaveLength(0);
	});
});
