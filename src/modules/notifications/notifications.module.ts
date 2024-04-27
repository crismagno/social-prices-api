import { forwardRef, Module } from '@nestjs/common';

import { schemasModule } from '../../infra/database/mongo/schemas';
import EmailTransportService from '../../infra/services/email-transport/email-transport-service';
import { CodesModule } from '../codes/codes.module';
import { UsersModule } from '../users/users.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
	imports: [
		schemasModule.notification,
		CodesModule,
		forwardRef(() => UsersModule),
	],
	controllers: [NotificationsController],
	providers: [NotificationsService, EmailTransportService],
	exports: [NotificationsService],
})
export class NotificationsModule {}
