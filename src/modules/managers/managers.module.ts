import { Module } from '@nestjs/common';

import { schemasModule } from '../../infra/database/mongo/schemas';
import HashCrypt from '../../infra/hash-crypt/hash-crypt';
import { NotificationsModule } from '../notifications/notifications.module';
import { ManagersController } from './managers.controller';
import { ManagersService } from './managers.service';

@Module({
	imports: [schemasModule.manager, NotificationsModule],
	controllers: [ManagersController],
	providers: [ManagersService, HashCrypt],
	exports: [ManagersService],
})
export class ManagersModule {}
