import { Module } from '@nestjs/common';

import { schemasModule } from '../../infra/database/mongo/schemas';
import { FilesService } from '../../infra/services/files/files-service';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
	imports: [schemasModule.product, NotificationsModule, UsersModule],
	controllers: [ProductsController],
	providers: [ProductsService, FilesService],
	exports: [ProductsService],
})
export class ProductsModule {}
