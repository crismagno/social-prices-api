import { forwardRef, Module } from '@nestjs/common';

import { CodesModule } from '../codes/codes.module';
import EmailTransport from '../config/services/email-transport/email-transport';
import { UsersModule } from '../users/users.module';
import { NotificationService } from './notification.service';

@Module({
	imports: [CodesModule, forwardRef(() => UsersModule)],
	providers: [NotificationService, EmailTransport],
	exports: [NotificationService],
})
export class NotificationModule {}
