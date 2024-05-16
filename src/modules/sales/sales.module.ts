import { Module } from '@nestjs/common';

import { schemasModule } from '../../infra/database/mongo/schemas';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
	imports: [schemasModule.sale, NotificationsModule, UsersModule],
	controllers: [SalesController],
	providers: [SalesService],
})
export class SalesModule {}
