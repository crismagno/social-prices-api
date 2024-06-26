import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpException,
	HttpStatus,
	Logger,
} from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';

@Catch()
export class AllExceptionFilter implements ExceptionFilter {
	private readonly _logger: Logger;

	constructor() {
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

		console.log(exception);

		const message: any =
			exception instanceof HttpException ? exception.getResponse() : exception;

		this._logger.error(
			`Status: ${status}, message: ${JSON.stringify(message)}`,
		);

		response.status(status).json({
			timestamp: new Date().toISOString(),
			path: request.url,
			error: message,
		});
	}
}
