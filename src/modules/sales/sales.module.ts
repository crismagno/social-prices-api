import { Module } from '@nestjs/common';

import { schemasModule } from '../../infra/database/mongo/schemas';
import { CustomersModule } from '../customers/customers.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StoresModule } from '../stores/stores.module';
import { UsersModule } from '../users/users.module';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
	imports: [
		schemasModule.sale,
		NotificationsModule,
		UsersModule,
		StoresModule,
		CustomersModule,
	],
	controllers: [SalesController],
	providers: [SalesService],
})
export class SalesModule {}
