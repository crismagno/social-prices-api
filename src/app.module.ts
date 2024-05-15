import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { MulterModule } from '@nestjs/platform-express';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import AuthorizationToken from './infra/authorization/authorization-token';
import { JwtModuleRegister } from './infra/authorization/authorization-token.enum';
import { MongooseModuleForRoot } from './infra/database/mongo/mongo';
import { AuthModule } from './modules/auth/auth.module';
import { AuthGuard } from './modules/auth/guards/auth.guard';
import { CategoriesModule } from './modules/categories/categories.module';
import { CodesModule } from './modules/codes/codes.module';
import { CustomersModule } from './modules/customers/customers.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ProductsModule } from './modules/products/products.module';
import { StoresModule } from './modules/stores/stores.module';
import { UsersModule } from './modules/users/users.module';
import { SalesModule } from './modules/sales/sales.module';

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
		NotificationsModule,
		StoresModule,
		ProductsModule,
		CategoriesModule,
		CustomersModule,
		SalesModule,
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
