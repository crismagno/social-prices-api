import { Module } from '@nestjs/common';

import { schemasModule } from '../../infra/database/mongo/schemas';
import { FilesService } from '../../infra/services/files/files-service';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
	imports: [schemasModule.customer, NotificationsModule, UsersModule],
	controllers: [CustomersController],
	providers: [CustomersService, FilesService],
	exports: [CustomersService],
})
export class CustomersModule {}
