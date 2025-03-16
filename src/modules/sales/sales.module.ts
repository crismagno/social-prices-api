import { Module } from '@nestjs/common';

import { schemasModule } from '../../infra/database/mongo/schemas';
import { CountersModule } from '../counters/counters.module';
import { CustomersModule } from '../customers/customers.module';
import { FilesUploadsModule } from '../files-uploads/files-uploads.module';
import { FilesModule } from '../files/files.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProductsModule } from '../products/products.module';
import { SocketsModule } from '../sockets/sockets.module';
import { StoresModule } from '../stores/stores.module';
import { TagsModule } from '../tags/tags.module';
import { UsersModule } from '../users/users.module';
import { SalesValidationService } from './sales-validation.service';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
	imports: [
		schemasModule.sale,
		NotificationsModule,
		UsersModule,
		StoresModule,
		CustomersModule,
		ProductsModule,
		CountersModule,
		TagsModule,
		SocketsModule,
		FilesModule,
		FilesUploadsModule,
	],
	controllers: [SalesController],
	providers: [SalesService, SalesValidationService],
})
export class SalesModule {}
