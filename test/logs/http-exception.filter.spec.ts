import {
	ForbiddenException,
	InternalServerErrorException,
	NotFoundException,
	UnauthorizedException,
} from '@nestjs/common';

import { LogsService } from '../../src/modules/logs/logs.service';
import { AllExceptionFilter } from '../../src/shared/filters/http-exception.filter';

describe('AllExceptionFilter', () => {
	let filter: AllExceptionFilter;
	let logsService: { error: jest.Mock };
	let response: { status: jest.Mock; json: jest.Mock };

	const buildHost = () =>
		({
			switchToHttp: () => ({
				getResponse: () => response,
				getRequest: () => ({ url: '/api/v1/sales', method: 'POST' }),
			}),
		}) as any;

	beforeEach(() => {
		logsService = { error: jest.fn().mockResolvedValue(undefined) };
		response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
		filter = new AllExceptionFilter(logsService as unknown as LogsService);
	});

	it('persists a 500 as an ERROR log with request context', async () => {
		filter.catch(new InternalServerErrorException('boom'), buildHost());

		expect(logsService.error).toHaveBeenCalledTimes(1);

		const [message, data] = logsService.error.mock.calls[0];

		expect(typeof message).toBe('string');
		expect(data).toEqual(
			expect.objectContaining({
				statusCode: 500,
				path: '/api/v1/sales',
				method: 'POST',
			}),
		);
	});

	it('persists an unhandled non-http error', async () => {
		filter.catch(new Error('unexpected'), buildHost());

		expect(logsService.error).toHaveBeenCalledTimes(1);
		expect(logsService.error.mock.calls[0][1]).toEqual(
			expect.objectContaining({ statusCode: 500 }),
		);
	});

	it.each([
		['401', new UnauthorizedException(), 401],
		['403', new ForbiddenException(), 403],
		['404', new NotFoundException(), 404],
	])('persists a %s', (_label: string, exception: any, statusCode: number) => {
		filter.catch(exception, buildHost());

		expect(logsService.error).toHaveBeenCalledTimes(1);
		expect(logsService.error.mock.calls[0][1]).toEqual(
			expect.objectContaining({ statusCode }),
		);
	});

	it('still answers the request when persisting the log fails', () => {
		logsService.error.mockRejectedValue(new Error('mongo is down'));

		expect(() =>
			filter.catch(new InternalServerErrorException('boom'), buildHost()),
		).not.toThrow();

		expect(response.status).toHaveBeenCalledWith(500);
		expect(response.json).toHaveBeenCalled();
	});
});
