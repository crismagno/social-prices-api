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
import { ProductItemsValidationService } from './product-items-validation.service';
import { ProductItemsController } from './product-items.controller';
import { ProductItemsService } from './product-items.service';

@Module({
	imports: [
		schemasModule.productItem,
		NotificationsModule,
		UsersModule,
		FilesModule,
		SocketsModule,
		FilesUploadsModule,
		TagsModule,
		CategoriesModule,
		StoresModule,
	],
	controllers: [ProductItemsController],
	providers: [ProductItemsService, ProductItemsValidationService],
	exports: [ProductItemsService],
})
export class ProductsModule {}
