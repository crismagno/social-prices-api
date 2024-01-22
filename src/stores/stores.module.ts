import { Module } from '@nestjs/common';

import { AmazonFilesService } from '../infra/services/amazon/amazon-files-service';
import { NotificationModule } from '../notification/notification.module';
import { schemasModule } from '../shared/modules/imports/schemas/schemas';
import { UsersModule } from '../users/users.module';
import { StoresController } from './stores.controller';
import { StoresService } from './stores.service';

@Module({
	imports: [schemasModule.store, NotificationModule, UsersModule],
	providers: [StoresService, AmazonFilesService],
	controllers: [StoresController],
})
export class StoresModule {}
