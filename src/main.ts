import * as compression from 'compression';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap() {
	const app = await NestFactory.create(AppModule, {
		cors: true,
		// The Meta webhook signs the exact bytes of the body, so they are kept.
		rawBody: true,
	});

	// Behind a reverse proxy, the visitor's address is only known if the proxy is
	// trusted: set TRUST_PROXY_HOPS to how many proxies sit in front of the API.
	// Left unset, every request counts as coming from the proxy itself.
	const trustProxyHops: number = Number(process.env.TRUST_PROXY_HOPS ?? 0);

	if (Number.isInteger(trustProxyHops) && trustProxyHops > 0) {
		app.getHttpAdapter().getInstance().set('trust proxy', trustProxyHops);
	}

	app.use(compression());

	await app.listen(process.env.PORT);
}

bootstrap();
