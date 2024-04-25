import { forwardRef, Module } from '@nestjs/common';

import { schemasModule } from '../../infra/database/mongo/schemas';
import EmailTransportService from '../../infra/services/email-transport/email-transport-service';
import { CodesModule } from '../codes/codes.module';
import { UsersModule } from '../users/users.module';
import { NotificationService } from './notification.service';

@Module({
	imports: [
		schemasModule.notification,
		CodesModule,
		forwardRef(() => UsersModule),
	],
	providers: [NotificationService, EmailTransportService],
	exports: [NotificationService],
})
export class NotificationModule {}
