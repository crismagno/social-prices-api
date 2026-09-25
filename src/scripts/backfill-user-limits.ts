import { INestApplicationContext, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from '../app.module';
import { UsersService } from '../modules/users/users.service';

/**
 * Gives the default feature limits to users created before limits existed.
 * Only touches users without a `limits` field, so it is safe to run twice.
 *
 * Run manually: npm run script:backfill-user-limits
 */
const bootstrap = async (): Promise<void> => {
	const logger: Logger = new Logger('BackfillUserLimits');

	let context: INestApplicationContext;

	try {
		context = await NestFactory.createApplicationContext(AppModule, {
			logger: ['error', 'warn', 'log'],
		});

		const usersService: UsersService = context.get(UsersService, {
			strict: false,
		});

		const modified: number = await usersService.backfillMissingLimits();

		logger.log(`Users updated: ${modified}`);
	} catch (error: any) {
		logger.error(error?.message ?? error);

		process.exitCode = 1;
	} finally {
		await context?.close();
	}
};

bootstrap();
