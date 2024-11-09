import { Module } from '@nestjs/common';

import { schemasModule } from '../../infra/database/mongo/schemas';
import { FilesModule } from '../files/files.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { StoresController } from './stores.controller';
import { StoresService } from './stores.service';

@Module({
	imports: [schemasModule.store, NotificationsModule, UsersModule, FilesModule],
	providers: [StoresService],
	controllers: [StoresController],
	exports: [StoresService],
})
export class StoresModule {}
