import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { MulterModule } from '@nestjs/platform-express';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AuthGuard } from './auth/guards/auth.guard';
import { CodesModule } from './codes/codes.module';
import AuthorizationToken from './config/authorization/authorization-token';
import { JwtModuleRegister } from './config/authorization/authorization-token.enum';
import { MongooseModuleForRoot } from './config/database/mongo/mongo';
import { NotificationModule } from './notification/notification.module';
import { UsersModule } from './users/users.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
		}),
		MulterModule.register({
			dest: './uploads',
		}),
		MongooseModuleForRoot(),
		JwtModuleRegister(),
		AuthModule,
		UsersModule,
		CodesModule,
		NotificationModule,
	],
	controllers: [AppController],
	providers: [
		AppService,
		AuthorizationToken,
		{
			provide: APP_GUARD,
			useClass: AuthGuard,
		},
	],
})
export class AppModule {}
