import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpException,
	HttpStatus,
	Injectable,
	Logger,
} from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';

import AuthEnum from '../../modules/auth/interfaces/auth.enum';
import { LogsService } from '../../modules/logs/logs.service';

@Injectable()
@Catch()
export class AllExceptionFilter implements ExceptionFilter {
	private readonly _logger: Logger;

	constructor(private readonly _logsService: LogsService) {
		this._logger = new Logger(AllExceptionFilter.name);
	}

	public catch(exception: any, host: ArgumentsHost) {
		const ctx: HttpArgumentsHost = host.switchToHttp();
		const response = ctx.getResponse();
		const request = ctx.getRequest();

		const status: number =
			exception instanceof HttpException
				? exception.getStatus()
				: HttpStatus.INTERNAL_SERVER_ERROR;

		const message: any =
			exception instanceof HttpException ? exception.getResponse() : exception;

		this._logger.error(
			`Status: ${status}, message: ${JSON.stringify(message)}`,
		);

		/**
		 * Deliberately not awaited: persisting a log must not delay or block
		 * the response. LogsService never throws, and the catch here covers a
		 * synchronous rejection so the response is always sent.
		 */
		try {
			void this._logsService
				.error(`Status: ${status}, message: ${JSON.stringify(message)}`, {
					statusCode: status,
					path: request?.url ?? null,
					method: request?.method ?? null,
					stack: exception?.stack ?? null,
					userId: request?.[AuthEnum.RequestProps.AUTH_PAYLOAD]?._id ?? null,
				})
				.catch(() => undefined);
		} catch {
			// A failure to log must never affect the response.
		}

		response.status(status).json({
			timestamp: new Date().toISOString(),
			path: request.url,
			error: message,
		});
	}
}
