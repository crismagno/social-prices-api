import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import AuthorizationToken from '../../infra/authorization/authorization-token';
import HashCrypt from '../../infra/hash-crypt/hash-crypt';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginValidationMiddleware } from './middlewares/login-validation.middleware';

@Module({
	imports: [UsersModule, NotificationsModule],
	controllers: [AuthController],
	providers: [AuthService, HashCrypt, AuthorizationToken],
	exports: [AuthService],
})
export class AuthModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(LoginValidationMiddleware).forRoutes('login');
	}
}
