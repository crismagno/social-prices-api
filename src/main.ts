import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { AllExceptionFilter } from './shared/filters/http-exception.filter';

async function bootstrap() {
	const app = await NestFactory.create(AppModule, { cors: true });

	// app.enableCors();

	app.useGlobalFilters(new AllExceptionFilter());

	await app.listen(process.env.PORT);
}

bootstrap();
