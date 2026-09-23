import { INestApplicationContext, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from '../app.module';
import { IManager } from '../modules/managers/interfaces/manager.interface';
import { ManagersService } from '../modules/managers/managers.service';

/**
 * Creates the main manager, the only one that is not created through the panel.
 *
 * Idempotent and non destructive: if a manager with isMain true already exists, it
 * logs and exits 0 without touching anything. It never overwrites the password of an
 * existing main manager — running this twice by mistake must not reset production
 * access. To change that password, use the panel's recover password flow.
 *
 * Run manually: npm run script:create-main-manager
 */
const bootstrap = async (): Promise<void> => {
	const logger: Logger = new Logger('CreateMainManager');

	let context: INestApplicationContext;

	try {
		context = await NestFactory.createApplicationContext(AppModule, {
			logger: ['error', 'warn', 'log'],
		});

		const managersService: ManagersService = context.get(ManagersService, {
			strict: false,
		});

		const existingMain: IManager | null = await managersService.findMain();

		if (existingMain) {
			logger.log(
				`Main manager already exists (${existingMain.email}). Nothing to do.`,
			);

			return;
		}

		const name: string = process.env.MAIN_MANAGER_NAME;
		const email: string = process.env.MAIN_MANAGER_EMAIL;
		const password: string = process.env.MAIN_MANAGER_PASSWORD;
		const birthDateRaw: string = process.env.MAIN_MANAGER_BIRTH_DATE;

		if (!name || !email || !password) {
			logger.error(
				'MAIN_MANAGER_NAME, MAIN_MANAGER_EMAIL and MAIN_MANAGER_PASSWORD must all be set in .env',
			);

			process.exitCode = 1;

			return;
		}

		const manager: IManager = await managersService.createMain({
			name,
			email,
			password,
			birthDate: birthDateRaw ? new Date(birthDateRaw) : null,
		});

		logger.log(`Main manager created: ${manager.email}`);
	} catch (error: any) {
		if (_isLikelyMongoConnectionError(error)) {
			logger.error(
				'Could not reach MongoDB. If MONGO_URI points at the docker-compose hostname (e.g. "mongo"), it will not resolve outside docker compose — use a URI reachable from wherever this script runs.',
			);
		}

		logger.error(error);

		process.exitCode = 1;
	} finally {
		if (context) {
			await context.close();
		}
	}
};

/**
 * Best effort check for a Mongo connection failure, so the error message can point
 * at the likely cause instead of a raw stack trace. Never inspects env values.
 */
const _isLikelyMongoConnectionError = (error: any): boolean => {
	const message: string = error?.message ?? String(error);

	return (
		error?.name === 'MongooseServerSelectionError' ||
		/ECONNREFUSED|ENOTFOUND|MongoNetworkError/i.test(message)
	);
};

bootstrap().catch((error: any) => {
	// eslint-disable-next-line no-console
	console.error(error);

	process.exitCode = 1;
});
