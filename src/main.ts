import * as compression from 'compression';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap() {
	const app = await NestFactory.create(AppModule, {
		cors: true,
	});

	app.use(compression());

	await app.listen(process.env.PORT);
}

bootstrap();
