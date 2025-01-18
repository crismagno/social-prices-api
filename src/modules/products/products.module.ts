import { Module } from '@nestjs/common';

import { schemasModule } from '../../infra/database/mongo/schemas';
import { CategoriesModule } from '../categories/categories.module';
import { FilesUploadsModule } from '../files-uploads/files-uploads.module';
import { FilesModule } from '../files/files.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SocketsModule } from '../sockets/sockets.module';
import { StoresModule } from '../stores/stores.module';
import { TagsModule } from '../tags/tags.module';
import { UsersModule } from '../users/users.module';
import { ProductsValidationService } from './products-validation.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
	imports: [
		schemasModule.product,
		NotificationsModule,
		UsersModule,
		FilesModule,
		SocketsModule,
		FilesUploadsModule,
		TagsModule,
		CategoriesModule,
		StoresModule,
	],
	controllers: [ProductsController],
	providers: [ProductsService, ProductsValidationService],
	exports: [ProductsService],
})
export class ProductsModule {}
