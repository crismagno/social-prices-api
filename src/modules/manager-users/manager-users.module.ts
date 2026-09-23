import { Module } from '@nestjs/common';

import { ManagersModule } from '../managers/managers.module';
import { UsersModule } from '../users/users.module';
import { ManagerUsersController } from './manager-users.controller';

@Module({
	// ManagersModule supplies ManagersService to ManagerLevelGuard, which re-loads
	// the acting manager on every request to this controller.
	imports: [UsersModule, ManagersModule],
	controllers: [ManagerUsersController],
})
export class ManagerUsersModule {}
