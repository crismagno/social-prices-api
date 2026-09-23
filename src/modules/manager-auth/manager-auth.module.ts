import { Module } from '@nestjs/common';

import AuthorizationToken from '../../infra/authorization/authorization-token';
import HashCrypt from '../../infra/hash-crypt/hash-crypt';
import { CodesModule } from '../codes/codes.module';
import { ManagersModule } from '../managers/managers.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ManagerAuthController } from './manager-auth.controller';
import { ManagerAuthService } from './manager-auth.service';

@Module({
	imports: [ManagersModule, CodesModule, NotificationsModule],
	controllers: [ManagerAuthController],
	providers: [ManagerAuthService, HashCrypt, AuthorizationToken],
	exports: [ManagerAuthService],
})
export class ManagerAuthModule {}
