import * as compression from 'compression';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { AllExceptionFilter } from './shared/filters/http-exception.filter';

async function bootstrap() {
	const app = await NestFactory.create(AppModule, {
		cors: true,
	});

	app.useGlobalFilters(new AllExceptionFilter());

	app.use(compression());

	app.use('/', (req: any, res: any) => {
		res.status(200).send('Welcome!');
	});

	app.use('/health', (req: any, res: any) => {
		res.status(200).send('OK');
	});

	await app.listen(process.env.PORT);
}

bootstrap();
