import { Module } from '@nestjs/common';

import { schemasModule } from '../../infra/database/mongo/schemas';
import {
  AmazonFilesService,
} from '../../infra/services/amazon/amazon-files-service';
import { NotificationModule } from '../notification/notification.module';
import { UsersModule } from '../users/users.module';
import { StoresController } from './stores.controller';
import { StoresService } from './stores.service';

@Module({
	imports: [schemasModule.store, NotificationModule, UsersModule],
	providers: [StoresService, AmazonFilesService],
	controllers: [StoresController],
})
export class StoresModule {}
