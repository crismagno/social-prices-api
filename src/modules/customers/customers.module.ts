import { Module } from '@nestjs/common';

import { schemasModule } from '../../infra/database/mongo/schemas';
import { FilesModule } from '../files/files.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SocketsModule } from '../sockets/sockets.module';
import { TagsModule } from '../tags/tags.module';
import { UsersModule } from '../users/users.module';
import { CustomersValidationService } from './customers-validation.service';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
	imports: [
		schemasModule.customer,
		NotificationsModule,
		UsersModule,
		TagsModule,
		SocketsModule,
		FilesModule,
	],
	controllers: [CustomersController],
	providers: [CustomersService, CustomersValidationService],
	exports: [CustomersService],
})
export class CustomersModule {}
