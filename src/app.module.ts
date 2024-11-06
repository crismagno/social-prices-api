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
import { CountersModule } from './modules/counters/counters.module';
import { CustomersModule } from './modules/customers/customers.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { FilesModule } from './modules/files/files.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ProductsModule } from './modules/products/products.module';
import { SalesModule } from './modules/sales/sales.module';
import { SocketsModule } from './modules/sockets/sockets.module';
import { StoresModule } from './modules/stores/stores.module';
import { TagsModule } from './modules/tags/tags.module';
import { UsersModule } from './modules/users/users.module';

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
		CategoriesModule,
		CodesModule,
		CustomersModule,
		CountersModule,
		EmployeesModule,
		NotificationsModule,
		ProductsModule,
		SalesModule,
		StoresModule,
		TagsModule,
		FilesModule,
		SocketsModule,
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
