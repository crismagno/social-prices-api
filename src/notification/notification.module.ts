import { forwardRef, Module } from '@nestjs/common';

import { CodesModule } from '../codes/codes.module';
import EmailTransportService from '../infra/services/email-transport/email-transport-service';
import { UsersModule } from '../users/users.module';
import { NotificationService } from './notification.service';

@Module({
	imports: [CodesModule, forwardRef(() => UsersModule)],
	providers: [NotificationService, EmailTransportService],
	exports: [NotificationService],
})
export class NotificationModule {}
